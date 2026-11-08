import { Injectable, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  // Get all dynamic form options directly from database
  async getFormOptions(pool: Pool) {
    const branches = await pool.query(
      `SELECT id, name, code, city FROM branches WHERE is_active = true ORDER BY name ASC`,
    );
    const statuses = await pool.query(
      `SELECT id, name, color FROM lead_statuses ORDER BY sort_order ASC, name ASC`,
    );
    const campaigns = await pool.query(
      `SELECT id, name FROM campaigns WHERE is_active = true ORDER BY name ASC`,
    );
    const counselors = await pool.query(
      `SELECT id, name, email, role FROM users WHERE is_active = true ORDER BY name ASC`,
    );
    const receivedChannels = await pool.query(
      `SELECT id, name FROM lead_received_channels ORDER BY sort_order ASC`,
    );
    const leadSources = await pool.query(
      `SELECT id, name FROM lead_sources ORDER BY sort_order ASC, name ASC`,
    );
    const templates = await pool.query(
      `SELECT id, type, name, subject, body FROM templates WHERE is_active = true ORDER BY name ASC`,
    );
    const customFields = await pool.query(
      `SELECT 
        id, 
        field_name AS name, 
        field_label AS label, 
        field_type AS input_type, 
        options, 
        is_required AS required, 
        default_value, 
        sort_order 
       FROM custom_fields 
       WHERE is_active = true 
       ORDER BY sort_order ASC, created_at ASC`,
    );

    return {
      branches: branches.rows,
      statuses: statuses.rows,
      campaigns: campaigns.rows,
      counselors: counselors.rows,
      receivedChannels: receivedChannels.rows,
      leadSources: leadSources.rows,
      templates: templates.rows,
      customFields: customFields.rows,
    };
  }

  // Create new lead with full fields & followup activity
  async createLead(pool: Pool, dto: CreateLeadDto, currentUserId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fullName = [dto.first_name, dto.middle_name, dto.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      // If status_id is not UUID but status name or dto.lead_status was sent, resolve status_id
      let finalStatusId = dto.status_id || null;
      if (!finalStatusId && dto.lead_status) {
        const sRes = await client.query(`SELECT id FROM lead_statuses WHERE UPPER(name) = UPPER($1) LIMIT 1`, [dto.lead_status]);
        if (sRes.rows.length > 0) finalStatusId = sRes.rows[0].id;
      }
      if (!finalStatusId) {
        const defaultStatus = await client.query(`SELECT id FROM lead_statuses WHERE UPPER(name) = 'NEW' LIMIT 1`);
        if (defaultStatus.rows.length > 0) finalStatusId = defaultStatus.rows[0].id;
      }

      // Merge feedback / address into custom_data if present
      const finalCustomData = {
        ...(dto.custom_data || {}),
        ...(dto.address ? { address: dto.address } : {}),
        ...(dto.feedback ? { feedback: dto.feedback } : {}),
      };

      // Parameterized INSERT query - 100% SQL injection safe
      const insertSql = `
        INSERT INTO leads (
          name, first_name, middle_name, last_name, phone, email,
          branch_id, gender, date_of_birth, city, address, lead_received_on,
          status_id, lead_from, campaign_id, remark, refer_by,
          custom_data, next_followup_date, followup_time_from, followup_time_to,
          assigned_to, assigned_by, assigned_at, followup_remark, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, NOW(),
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, CASE WHEN $21::uuid IS NOT NULL THEN NOW() ELSE NULL END, $23, $24
        ) RETURNING id, lead_number, name, phone, email, created_at
      `;

      const fullPhone = dto.country_code ? `${dto.country_code} ${dto.phone}`.trim() : dto.phone;

      const params = [
        fullName,
        dto.first_name,
        dto.middle_name || null,
        dto.last_name || null,
        fullPhone,
        dto.email || null,
        dto.branch_id || null,
        dto.gender || null,
        dto.date_of_birth || null,
        dto.city || null,
        dto.address || null,
        finalStatusId,
        dto.lead_from || null,
        dto.campaign_id || null,
        dto.remark || null,
        dto.refer_by || null,
        JSON.stringify(finalCustomData),
        dto.next_followup_date || null,
        dto.followup_time_from || null,
        dto.followup_time_to || null,
        dto.assigned_to || null,
        dto.assigned_to ? currentUserId : null,
        dto.followup_remark || null,
        currentUserId,
      ];

      const res = await client.query(insertSql, params);
      const newLead = res.rows[0];

      // If next followup date was provided, create a Task entry automatically
      if (dto.next_followup_date) {
        await client.query(
          `INSERT INTO tasks (
            entity_type, entity_id, title, description, due_date, assigned_to, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'lead',
            newLead.id,
            `Follow-up call with ${newLead.name}`,
            dto.followup_remark || 'Scheduled followup from lead creation',
            dto.next_followup_date,
            dto.assigned_to || currentUserId,
            currentUserId,
          ],
        );
      }

      await client.query('COMMIT');
      return newLead;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw new BadRequestException(err.message || 'Failed to create lead');
    } finally {
      client.release();
    }
  }

  // Get paginated leads with all filters matching reference UI
  async getLeads(pool: Pool, query: any) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['l.is_deleted = false'];
    const values: any[] = [];
    let paramIndex = 1;

    // Search by name, phone, email, or city
    if (query.search && query.search.trim()) {
      conditions.push(
        `(l.name ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex} OR l.city ILIKE $${paramIndex} OR l.lead_from ILIKE $${paramIndex})`,
      );
      values.push(`%${query.search.trim()}%`);
      paramIndex++;
    }

    // Status filter
    if (query.status_id && query.status_id !== 'all') {
      conditions.push(`l.status_id = $${paramIndex}`);
      values.push(query.status_id);
      paramIndex++;
    }

    // Manager / Assigned to filter
    if (query.manager_id && query.manager_id !== 'all') {
      conditions.push(`l.assigned_to = $${paramIndex}`);
      values.push(query.manager_id);
      paramIndex++;
    }

    // Start Date (created_at >= start_date)
    if (query.start_date) {
      conditions.push(`l.created_at >= $${paramIndex}::date`);
      values.push(query.start_date);
      paramIndex++;
    }

    // End Date (created_at <= end_date 23:59:59)
    if (query.end_date) {
      conditions.push(`l.created_at <= ($${paramIndex}::date + interval '1 day')`);
      values.push(query.end_date);
      paramIndex++;
    }

    // Updated On filter
    if (query.updated_on) {
      conditions.push(`l.updated_at::date = $${paramIndex}::date`);
      values.push(query.updated_on);
      paramIndex++;
    }

    // Follow-up Date filter (e.g. today's followups or specific followup date)
    if (query.followup_date) {
      conditions.push(`l.next_followup_date::date = $${paramIndex}::date`);
      values.push(query.followup_date);
      paramIndex++;
    } else if (query.has_followup === 'true' || query.has_followup === true) {
      conditions.push(`l.next_followup_date IS NOT NULL`);
    }

    // Birthday filter (by date MM-DD or specific full date)
    if (query.birthday_date) {
      conditions.push(`TO_CHAR(l.date_of_birth, 'MM-DD') = TO_CHAR($${paramIndex}::date, 'MM-DD')`);
      values.push(query.birthday_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) FROM leads l ${whereClause}`;
    const countRes = await pool.query(countSql, values);
    const totalRecords = parseInt(countRes.rows[0].count, 10);

    // Main records query with JOINs
    const querySql = `
      SELECT 
        l.id,
        l.lead_number,
        l.name,
        l.first_name,
        l.last_name,
        l.phone,
        l.email,
        l.city,
        l.address,
        l.date_of_birth,
        l.gender,
        l.campaign_id,
        l.custom_data,
        l.lead_from,
        l.remark,
        l.lead_received_on,
        l.created_at,
        l.updated_at,
        l.next_followup_date,
        l.followup_time_from,
        l.followup_time_to,
        l.followup_remark,
        ls.name AS status_name,
        ls.color AS status_color,
        u.name AS assigned_to_name,
        u.id AS assigned_to_id,
        b.name AS branch_name
      FROM leads l
      LEFT JOIN lead_statuses ls ON l.status_id = ls.id
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN branches b ON l.branch_id = b.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const recordsRes = await pool.query(querySql, [...values, limit, offset]);

    // Fetch up to 5 recent remarks for all fetched leads
    const leadIds = recordsRes.rows.map((r: any) => r.id);
    let remarksByLead: Record<string, any[]> = {};
    let remarksCountByLead: Record<string, number> = {};

    if (leadIds.length > 0) {
      const remarksRes = await pool.query(
        `SELECT id, lead_id, remark, created_by_name, created_at
         FROM lead_remarks
         WHERE lead_id = ANY($1::uuid[])
         ORDER BY created_at DESC`,
        [leadIds],
      );

      for (const rem of remarksRes.rows) {
        if (!remarksByLead[rem.lead_id]) {
          remarksByLead[rem.lead_id] = [];
          remarksCountByLead[rem.lead_id] = 0;
        }
        remarksCountByLead[rem.lead_id]++;
        if (remarksByLead[rem.lead_id].length < 5) {
          remarksByLead[rem.lead_id].push(rem);
        }
      }
    }

    const enhancedRecords = recordsRes.rows.map((r: any) => ({
      ...r,
      recent_remarks: remarksByLead[r.id] || [],
      total_remarks: remarksCountByLead[r.id] || 0,
      latest_remark: remarksByLead[r.id]?.[0] || null,
    }));

    return {
      records: enhancedRecords,
      pagination: {
        totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
    };
  }

  // Delete lead (soft delete)
  async deleteLead(pool: Pool, leadId: string) {
    await pool.query(
      `UPDATE leads SET is_deleted = true, deleted_at = NOW() WHERE id = $1`,
      [leadId],
    );
    return { success: true };
  }

  // Bulk update leads (Set follow-up, Assign manager, or Delete all selected)
  async bulkUpdate(pool: Pool, body: any, currentUserId: string) {
    const { lead_ids, action, assigned_to, status_id, next_followup_date, followup_time_from, followup_remark } = body;
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      throw new BadRequestException('No leads selected');
    }

    if (action === 'delete') {
      await pool.query(
        `UPDATE leads SET is_deleted = true, deleted_at = NOW() WHERE id = ANY($1::uuid[])`,
        [lead_ids],
      );
      return { success: true, count: lead_ids.length, message: `${lead_ids.length} lead(s) deleted successfully` };
    }

    if (action === 'assign' && assigned_to) {
      await pool.query(
        `UPDATE leads SET assigned_to = $1, assigned_by = $2, assigned_at = NOW(), updated_at = NOW() WHERE id = ANY($3::uuid[])`,
        [assigned_to, currentUserId, lead_ids],
      );
      return { success: true, count: lead_ids.length, message: `${lead_ids.length} lead(s) assigned successfully` };
    }

    if (action === 'followup' && next_followup_date) {
      await pool.query(
        `UPDATE leads SET 
          next_followup_date = $1, 
          followup_time_from = $2, 
          followup_remark = COALESCE($3, followup_remark),
          updated_at = NOW() 
        WHERE id = ANY($4::uuid[])`,
        [next_followup_date, followup_time_from || null, followup_remark || null, lead_ids],
      );
      return { success: true, count: lead_ids.length, message: `Follow-up set for ${lead_ids.length} lead(s)` };
    }

    if (action === 'status' && status_id) {
      await pool.query(
        `UPDATE leads SET status_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
        [status_id, lead_ids],
      );
      return { success: true, count: lead_ids.length, message: `Status updated for ${lead_ids.length} lead(s)` };
    }

    return { success: true, message: 'Updated' };
  }

  // Add new remark to a lead (Enter to save)
  async addRemark(pool: Pool, leadId: string, remark: string, user: any) {
    if (!remark || !remark.trim()) {
      throw new BadRequestException('Remark cannot be empty');
    }

    const ins = await pool.query(
      `INSERT INTO lead_remarks (lead_id, remark, created_by, created_by_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, lead_id, remark, created_by_name, created_at`,
      [leadId, remark.trim(), user.id, user.name || 'Admin'],
    );

    // Also update remark on lead table for quick access
    await pool.query(
      `UPDATE leads SET remark = $1, updated_at = NOW() WHERE id = $2`,
      [remark.trim(), leadId],
    );

    return ins.rows[0];
  }

  // Get full history of remarks for a lead (Read more popup)
  async getLeadRemarks(pool: Pool, leadId: string) {
    const res = await pool.query(
      `SELECT id, lead_id, remark, created_by_name, created_at
       FROM lead_remarks
       WHERE lead_id = $1
       ORDER BY created_at DESC`,
      [leadId],
    );
    return res.rows;
  }

  // Get single lead by ID for View Lead page
  async getLeadById(pool: Pool, leadId: string) {
    const res = await pool.query(
      `SELECT 
        l.*,
        ls.name AS status_name,
        ls.color AS status_color,
        u.name AS assigned_to_name,
        u.email AS assigned_to_email,
        b.name AS branch_name,
        c.name AS campaign_name
      FROM leads l
      LEFT JOIN lead_statuses ls ON l.status_id = ls.id
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN branches b ON l.branch_id = b.id
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.id = $1 AND l.is_deleted = false`,
      [leadId],
    );

    if (res.rows.length === 0) {
      throw new BadRequestException('Lead not found');
    }

    const lead = res.rows[0];

    // Also fetch remarks history
    const remarks = await pool.query(
      `SELECT id, remark, created_by_name, created_at
       FROM lead_remarks
       WHERE lead_id = $1
       ORDER BY created_at DESC`,
      [leadId],
    );

    // Also fetch activity history
    const history = await pool.query(
      `SELECT id, event_type, lead_status, event_date, data, updated_by_name, created_at
       FROM lead_activity_history
       WHERE lead_id = $1
       ORDER BY created_at DESC`,
      [leadId],
    );

    return {
      ...lead,
      remarks: remarks.rows,
      history: history.rows,
    };
  }

  // Bulk import leads from CSV / Excel (No validation block, saves everything)
  async importLeads(pool: Pool, leads: any[], currentUserId: string) {
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new BadRequestException('No leads provided to import');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Default status ID (NEW)
      const stRes = await client.query(`SELECT id FROM lead_statuses WHERE UPPER(name) = 'NEW' LIMIT 1`);
      const defaultStatusId = stRes.rows[0]?.id || null;

      let insertedCount = 0;

      for (const row of leads) {
        // Dynamic field extraction - supports any header names case-insensitively
        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            for (const rk of Object.keys(row)) {
              if (rk.trim().toLowerCase() === k.trim().toLowerCase() && row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
                return String(row[rk]).trim();
              }
            }
          }
          return null;
        };

        const firstName = getVal('first_name', 'firstname', 'first name', 'name') || 'Lead';
        const middleName = getVal('middle_name', 'middlename', 'middle name') || null;
        const lastName = getVal('last_name', 'lastname', 'last name') || null;
        const phone = getVal('phone', 'mobile', 'mobile number', 'phone number', 'contact', 'contact number') || 'N/A';
        const email = getVal('email', 'email id', 'email address') || null;
        const city = getVal('city', 'location') || null;
        const address = getVal('address', 'full address') || null;
        const leadFrom = getVal('lead_from', 'lead from', 'source', 'lead source') || 'Bulk Import';
        const leadReceivedOn = getVal('lead_received_on', 'lead received on', 'received on') || 'Excel Upload';
        const remark = getVal('remark', 'remarks', 'note', 'notes', 'comment') || null;
        const referBy = getVal('refer', 'refer by', 'referred by') || null;

        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || 'Lead';

        const insertSql = `
          INSERT INTO leads (
            name, first_name, middle_name, last_name, phone, email,
            city, address, lead_from, remark, refer_by, status_id,
            custom_data, created_by, lead_received_on, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, NOW(), NOW(), NOW()
          ) RETURNING id
        `;

        // Store entire raw row into custom_data so NO fields are lost
        const customDataJson = JSON.stringify(row);

        const res = await client.query(insertSql, [
          fullName,
          firstName,
          middleName,
          lastName,
          phone,
          email,
          city,
          address,
          leadFrom,
          remark,
          referBy,
          defaultStatusId,
          customDataJson,
          currentUserId,
        ]);

        if (remark && res.rows[0]) {
          await client.query(
            `INSERT INTO lead_remarks (lead_id, remark, created_by, created_by_name)
             VALUES ($1, $2, $3, $4)`,
            [res.rows[0].id, remark, currentUserId, 'Bulk Import'],
          );
        }

        insertedCount++;
      }

      await client.query('COMMIT');
      return {
        success: true,
        count: insertedCount,
        message: `${insertedCount} lead(s) imported successfully`,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw new BadRequestException(err.message || 'Failed to import leads');
    } finally {
      client.release();
    }
  }

  // Update lead details from Edit Lead modal
  async updateLead(pool: Pool, leadId: string, body: any, user: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      if (currentRes.rows.length === 0) {
        throw new BadRequestException('Lead not found');
      }
      const old = currentRes.rows[0];

      const fullName = [body.first_name, body.middle_name, body.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || old.name;

      const updateSql = `
        UPDATE leads SET
          name = $1,
          first_name = $2,
          middle_name = $3,
          last_name = $4,
          phone = $5,
          email = $6,
          branch_id = $7,
          gender = $8,
          date_of_birth = $9,
          city = $10,
          lead_received_on = COALESCE($11, lead_received_on),
          status_id = $12,
          lead_from = $13,
          campaign_id = $14,
          remark = $15,
          refer_by = $16,
          custom_data = $17,
          next_followup_date = $18,
          followup_time_from = $19,
          followup_time_to = $20,
          assigned_to = $21,
          followup_remark = $22,
          updated_at = NOW()
        WHERE id = $23
        RETURNING *
      `;

      const finalCustomData = {
        ...(old.custom_data || {}),
        ...(body.custom_data || {}),
      };

      const params = [
        fullName,
        body.first_name || null,
        body.middle_name || null,
        body.last_name || null,
        body.phone || old.phone,
        body.email || null,
        body.branch_id || null,
        body.gender || null,
        body.date_of_birth || null,
        body.city || null,
        body.lead_received_on || null,
        body.status_id || old.status_id,
        body.lead_from || null,
        body.campaign_id || null,
        body.remark || null,
        body.refer_by || null,
        JSON.stringify(finalCustomData),
        body.next_followup_date || null,
        body.followup_time_from || null,
        body.followup_time_to || null,
        body.assigned_to || null,
        body.followup_remark || null,
        leadId,
      ];

      const updateRes = await client.query(updateSql, params);

      // Record Activity History
      const statusRes = await client.query('SELECT name FROM lead_statuses WHERE id = $1', [body.status_id || old.status_id]);
      const statusName = statusRes.rows[0]?.name || 'UPDATED';

      const historyData = {
        'Lead Status': statusName,
        'Phone Number': body.phone || old.phone,
        'Name': fullName,
        'City': body.city || old.city || 'N/A',
        'Remark': body.remark || old.remark || '',
        'Assigned To': user.name || 'Admin',
        'Lead From': body.lead_from || old.lead_from || 'N/A',
      };

      await client.query(
        `INSERT INTO lead_activity_history (
          lead_id, event_type, lead_status, data, updated_by_name
        ) VALUES ($1, $2, $3, $4, $5)`,
        [leadId, 'Lead Updated', statusName, JSON.stringify(historyData), user.name || 'Admin'],
      );

      // If remark changed or followup remark entered, also add to remarks table
      if (body.remark && body.remark !== old.remark) {
        await client.query(
          `INSERT INTO lead_remarks (lead_id, remark, created_by, created_by_name)
           VALUES ($1, $2, $3, $4)`,
          [leadId, body.remark, user.id, user.name || 'Admin'],
        );
      }

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw new BadRequestException(err.message || 'Failed to update lead');
    } finally {
      client.release();
    }
  }

  // GET /api/leads/dashboard-metrics - Real-time Database Dashboard Metrics & Charts
  async getDashboardMetrics(pool: Pool, filters?: { startDate?: string; endDate?: string; managerId?: string; statusId?: string }) {
    // Build conditional where clause for date, manager, and status filters
    let whereClauses = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;

    if (filters?.startDate) {
      whereClauses.push(`l.created_at >= $${pIdx++}`);
      params.push(`${filters.startDate} 00:00:00`);
    }
    if (filters?.endDate) {
      whereClauses.push(`l.created_at <= $${pIdx++}`);
      params.push(`${filters.endDate} 23:59:59`);
    }
    if (filters?.managerId) {
      whereClauses.push(`l.assigned_to = $${pIdx++}`);
      params.push(filters.managerId);
    }
    if (filters?.statusId) {
      whereClauses.push(`l.status_id = $${pIdx++}`);
      params.push(filters.statusId);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Total Leads matching filter
    const totalLeadsRes = await pool.query(
      `SELECT count(*) FROM leads l WHERE ${whereSql}`,
      params,
    );
    const totalLeads = parseInt(totalLeadsRes.rows[0]?.count || '0', 10);

    // 2. Today Followups
    const todayFollowupsRes = await pool.query(
      `SELECT count(*) FROM leads l WHERE DATE(l.next_followup_date) = CURRENT_DATE`,
    );
    const todayFollowup = parseInt(todayFollowupsRes.rows[0]?.count || '0', 10);

    // 3. All Followups (pending future or overdue)
    const allFollowupsRes = await pool.query(
      `SELECT count(*) FROM leads l WHERE l.next_followup_date IS NOT NULL`,
    );
    const allFollowup = parseInt(allFollowupsRes.rows[0]?.count || '0', 10);

    // 4. Today Birthdays
    const todayBirthdaysRes = await pool.query(
      `SELECT count(*) FROM leads l 
       WHERE l.date_of_birth IS NOT NULL 
         AND EXTRACT(MONTH FROM l.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) 
         AND EXTRACT(DAY FROM l.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)`,
    );
    const todayBirthday = parseInt(todayBirthdaysRes.rows[0]?.count || '0', 10);

    // 4b. Total Active Branches
    const branchesRes = await pool.query(`SELECT count(*) FROM branches WHERE is_active = true`);
    const totalBranches = parseInt(branchesRes.rows[0]?.count || '0', 10);

    // 4c. Total Counselors / Agents
    const counselorsRes = await pool.query(`SELECT count(*) FROM users WHERE is_active = true`);
    const totalCounselors = parseInt(counselorsRes.rows[0]?.count || '0', 10);

    // 5. Total IVR Calls & durations
    const callsRes = await pool.query(`
      SELECT 
        COUNT(*) AS total_calls,
        COUNT(*) FILTER (WHERE call_type = 'incoming') AS incoming_calls,
        COUNT(*) FILTER (WHERE call_type = 'outgoing') AS outgoing_calls,
        COALESCE(SUM(NULLIF(regexp_replace(call_duration, '[^0-9]', '', 'g'), '')::int), 0) AS total_duration_seconds
      FROM ivr_calls
    `);
    const callStats = callsRes.rows[0];

    // 6. Lead Flow Trend (Last 7 Days dynamic aggregation)
    const trendRes = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date AS day
      )
      SELECT 
        TO_CHAR(ds.day, 'DD/MM') AS date,
        COUNT(l.id) AS leads
      FROM date_series ds
      LEFT JOIN leads l ON DATE(l.created_at) = ds.day
      GROUP BY ds.day
      ORDER BY ds.day ASC
    `);

    // 7. Lead Sources Distribution (From DB)
    const sourcesRes = await pool.query(`
      SELECT 
        COALESCE(NULLIF(l.lead_from, ''), 'Direct') AS name,
        COUNT(l.id) AS value
      FROM leads l
      WHERE ${whereSql}
      GROUP BY COALESCE(NULLIF(l.lead_from, ''), 'Direct')
      ORDER BY value DESC
      LIMIT 6
    `, params);

    const sourcePalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const leadSources = sourcesRes.rows.map((r, i) => ({
      name: r.name,
      value: parseInt(r.value, 10),
      color: sourcePalette[i % sourcePalette.length],
    }));

    // 8. Conversion Pipeline Funnel (Dynamic by Lead Statuses)
    const funnelRes = await pool.query(`
      SELECT 
        COALESCE(ls.name, 'Unassigned') AS stage,
        COALESCE(ls.color, '#64748b') AS color,
        COUNT(l.id) AS count
      FROM leads l
      LEFT JOIN lead_statuses ls ON ls.id = l.status_id
      WHERE ${whereSql}
      GROUP BY COALESCE(ls.name, 'Unassigned'), COALESCE(ls.color, '#64748b'), ls.sort_order
      ORDER BY COALESCE(ls.sort_order, 99) ASC, count DESC
    `, params);

    const funnel = funnelRes.rows.map((r) => ({
      stage: r.stage,
      count: parseInt(r.count, 10),
      color: r.color,
    }));

    // 9. Recent Leads list (for quick table view / audit)
    const recentLeadsRes = await pool.query(`
      SELECT 
        l.id,
        l.lead_number,
        l.name,
        l.phone,
        l.email,
        l.city,
        l.lead_from,
        l.created_at,
        ls.name AS status_name,
        ls.color AS status_color,
        u.name AS counselor_name
      FROM leads l
      LEFT JOIN lead_statuses ls ON ls.id = l.status_id
      LEFT JOIN users u ON u.id = l.assigned_to
      ORDER BY l.created_at DESC
      LIMIT 6
    `);

    // 10. Top Sales Team Performers based on leads handled & IVR talktime
    const performersRes = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.role,
        COUNT(DISTINCT l.id) AS leads_handled,
        COUNT(DISTINCT c.id) AS calls_count
      FROM users u
      LEFT JOIN leads l ON l.assigned_to = u.id
      LEFT JOIN ivr_calls c ON c.agent_id = u.id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.role
      ORDER BY leads_handled DESC, calls_count DESC
      LIMIT 5
    `);

    return {
      metrics: {
        totalLeads,
        todayFollowup,
        allFollowup,
        todayBirthday,
        totalBranches,
        totalCounselors,
        totalCalls: parseInt(callStats?.total_calls || '0', 10),
        incomingCalls: parseInt(callStats?.incoming_calls || '0', 10),
        outgoingCalls: parseInt(callStats?.outgoing_calls || '0', 10),
        totalDurationSeconds: parseInt(callStats?.total_duration_seconds || '0', 10),
      },
      chartData: trendRes.rows.map(r => ({ date: r.date, leads: parseInt(r.leads, 10) })),
      leadSourceData: leadSources.length > 0 ? leadSources : [{ name: 'Direct', value: 0, color: '#3b82f6' }],
      funnelData: funnel,
      recentLeads: recentLeadsRes.rows,
      performers: performersRes.rows.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        leads: parseInt(p.leads_handled, 10),
        calls: parseInt(p.calls_count, 10),
      })),
    };
  }
}
