import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class WorkReportService {
  // 1. Get Managers & Sales Reps
  async getManagers(pool: Pool) {
    const res = await pool.query(
      `SELECT id, name, email, role FROM users WHERE is_active = true ORDER BY name ASC`,
    );
    return res.rows;
  }

  // 2. Comprehensive Google-Level Work Report (Analytics, Pipeline Velocity, Calling Stats, and Detailed Kacha Chitta)
  async getReportData(
    pool: Pool,
    date?: string,
    managerId?: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const params: any[] = [];
    let idx = 1;

    // Filters for leads table
    const whereClauses: string[] = ['l.is_deleted = false'];

    if (managerId && managerId.trim()) {
      whereClauses.push(`l.assigned_to = $${idx++}`);
      params.push(managerId.trim());
    }

    if (date && date.trim()) {
      whereClauses.push(`DATE(l.created_at) = $${idx++}`);
      params.push(date.trim());
    }

    if (search && search.trim()) {
      whereClauses.push(`(l.name ILIKE $${idx} OR l.phone ILIKE $${idx} OR l.city ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Status Breakdown (LEAD STATUS & COUNT)
    const statusQuery = `
      SELECT 
        s.id AS status_id,
        s.name AS status_name,
        s.color AS status_color,
        COUNT(l.id)::int AS count
      FROM lead_statuses s
      LEFT JOIN leads l ON l.status_id = s.id 
        ${managerId ? `AND l.assigned_to = '${managerId}'` : ''} 
        ${date ? `AND DATE(l.created_at) = '${date}'` : ''} 
        AND l.is_deleted = false
      GROUP BY s.id, s.name, s.color, s.sort_order
      HAVING COUNT(l.id) > 0
      ORDER BY s.sort_order ASC, s.name ASC
    `;
    const statusRes = await pool.query(statusQuery);

    // Total Count
    const totalCountQuery = `
      SELECT COUNT(l.id)::int AS total
      FROM leads l
      ${whereStr}
    `;
    const totalCountRes = await pool.query(totalCountQuery, params);
    const totalLeads = totalCountRes.rows[0]?.total || 0;

    // 2. High-Level Performance KPI Metrics
    // Conversions: Statuses like 'DEAL CLOSED CLIENT ACHIEVED' or converted_at
    const conversionQuery = `
      SELECT 
        COUNT(l.id) FILTER (WHERE s.name ILIKE '%DEAL%' OR s.name ILIKE '%CLOSED%' OR s.name ILIKE '%WON%')::int AS converted_leads,
        COUNT(l.id) FILTER (WHERE s.name ILIKE '%LOST%' OR s.name ILIKE '%NO REQUIREMENT%')::int AS lost_leads,
        COUNT(l.id) FILTER (WHERE s.name ILIKE '%FOLLOW%' OR s.name ILIKE '%DEMO%' OR s.name ILIKE '%INTERESTED%')::int AS active_leads,
        COUNT(l.id) FILTER (WHERE l.next_followup_date = CURRENT_DATE)::int AS today_followups_due,
        COUNT(l.id) FILTER (WHERE l.next_followup_date < CURRENT_DATE AND l.next_followup_date IS NOT NULL)::int AS overdue_followups
      FROM leads l
      LEFT JOIN lead_statuses s ON s.id = l.status_id
      ${whereStr}
    `;
    const kpiRes = await pool.query(conversionQuery, params);
    const kpis = kpiRes.rows[0] || {
      converted_leads: 0,
      lost_leads: 0,
      active_leads: 0,
      today_followups_due: 0,
      overdue_followups: 0,
    };

    // Conversion Rate %
    const conversionRate = totalLeads > 0 
      ? Math.round((kpis.converted_leads / totalLeads) * 100) 
      : 0;

    // 3. Telephony / IVR Calling Metrics
    const callStatsRes = await pool.query(`
      SELECT 
        COUNT(id)::int AS total_calls,
        COALESCE(SUM(NULLIF(regexp_replace(call_duration, '[^0-9]', '', 'g'), '')::int), 0)::int AS total_duration_seconds,
        COUNT(id) FILTER (WHERE call_type = 'outgoing')::int AS outgoing_calls,
        COUNT(id) FILTER (WHERE call_type = 'incoming')::int AS incoming_calls,
        COUNT(id) FILTER (WHERE NULLIF(regexp_replace(call_duration, '[^0-9]', '', 'g'), '')::int > 0)::int AS connected_calls
      FROM ivr_calls
    `);
    const callStats = callStatsRes.rows[0] || {
      total_calls: 0,
      total_duration_seconds: 0,
      outgoing_calls: 0,
      incoming_calls: 0,
      connected_calls: 0,
    };

    // Format Talk Time into Hours and Mins
    const totalSecs = callStats.total_duration_seconds;
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const formattedTalkTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${totalSecs % 60}s`;

    // 4. Source / Lead From Distribution (Where leads are coming from)
    const sourceBreakdownRes = await pool.query(`
      SELECT 
        COALESCE(NULLIF(l.lead_from, ''), 'Direct / Other') AS source_name,
        COUNT(l.id)::int AS count
      FROM leads l
      ${whereStr}
      GROUP BY COALESCE(NULLIF(l.lead_from, ''), 'Direct / Other')
      ORDER BY count DESC
      LIMIT 6
    `, params);

    // 5. Daily Lead Trend (Last 7 Days) for Charting
    const trendRes = await pool.query(`
      SELECT 
        TO_CHAR(d.day, 'DD Mon') AS day_label,
        COUNT(l.id)::int AS count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(day)
      LEFT JOIN leads l ON DATE(l.created_at) = DATE(d.day) AND l.is_deleted = false ${managerId ? `AND l.assigned_to = '${managerId}'` : ''}
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    // 6. Lead Details Table (FIRST NAME, LEAD STATUS, REMARK, PHONE, CITY, CREATED AT, FOLLOWUP)
    const offset = (page - 1) * limit;
    const leadsDetailQuery = `
      SELECT 
        l.id,
        COALESCE(NULLIF(l.first_name, ''), l.name) AS first_name,
        l.last_name,
        l.name AS full_name,
        l.phone,
        l.city,
        l.remark,
        l.lead_from,
        l.next_followup_date,
        l.created_at,
        s.name AS status_name,
        s.color AS status_color,
        u.name AS manager_name
      FROM leads l
      LEFT JOIN lead_statuses s ON s.id = l.status_id
      LEFT JOIN users u ON u.id = l.assigned_to
      ${whereStr}
      ORDER BY l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const leadDetailParams = [...params, limit, offset];
    const leadsDetailRes = await pool.query(leadsDetailQuery, leadDetailParams);

    // Selected Manager Info
    let managerInfo = null;
    if (managerId) {
      const uRes = await pool.query(`SELECT id, name, email, phone, role FROM users WHERE id = $1`, [managerId]);
      managerInfo = uRes.rows[0] || null;
    }

    return {
      statusBreakdown: statusRes.rows,
      totalCount: totalLeads,
      kpis: {
        ...kpis,
        conversionRate,
        callStats: {
          ...callStats,
          formattedTalkTime,
        },
      },
      sourceBreakdown: sourceBreakdownRes.rows,
      weeklyTrend: trendRes.rows,
      leads: leadsDetailRes.rows,
      page,
      limit,
      totalPages: Math.ceil(totalLeads / limit) || 1,
      managerInfo,
    };
  }
}
