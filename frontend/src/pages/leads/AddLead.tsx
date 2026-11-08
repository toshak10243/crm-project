import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';
import { COUNTRIES } from '../../lib/countries';

const AddLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Form State
  const initialForm = {
    branch_id: '',
    country_code: '+91',
    phone: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    gender: '',
    date_of_birth: '',
    city: '',
    lead_received_on: 'Phone Call',
    status_id: '',
    lead_from: 'Other',
    lead_from_custom: '',
    campaign_id: '',
    remark: '',
    refer_by: '',
    // Custom Fields (100% dynamic from database)
    custom_data: {} as Record<string, any>,
    // Call Time section
    next_followup_date: '',
    followup_time_from: '',
    followup_time_to: '',
    assigned_to: '',
    followup_remark: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [_photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoFileName, setPhotoFileName] = useState('');

  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [counselorSearch, setCounselorSearch] = useState('');
  const [counselorDropdownOpen, setCounselorDropdownOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const countryRef = useRef<HTMLDivElement>(null);
  const counselorRef = useRef<HTMLDivElement>(null);

  // Fetch dropdown options direct from database
  const { data: optionsData } = useQuery({
    queryKey: ['lead-form-options'],
    queryFn: async () => {
      const res = await api.get('/leads/options');
      return res.data?.data;
    },
  });

  const branches = optionsData?.branches || [];
  const statuses = optionsData?.statuses || [];
  const campaigns = optionsData?.campaigns || [];
  const counselors = optionsData?.counselors || [];
  const receivedChannels = optionsData?.receivedChannels || [];
  const leadSources = optionsData?.leadSources || [];
  const customFields: any[] = optionsData?.customFields || [];

  // Initialize custom fields default values when loaded
  useEffect(() => {
    if (customFields.length > 0) {
      setFormData((prev) => {
        const nextCustom: Record<string, any> = { ...prev.custom_data };
        customFields.forEach((f) => {
          if (nextCustom[f.name] === undefined) {
            if (f.input_type === 'checkbox' && Array.isArray(f.options) && f.options.length > 0) {
              nextCustom[f.name] = f.default_value ? [f.default_value] : [];
            } else {
              nextCustom[f.name] = f.default_value || '';
            }
          }
        });
        return { ...prev, custom_data: nextCustom };
      });
    }
  }, [optionsData?.customFields]);

  // Filter countries for search
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const selectedCountry = COUNTRIES.find((c) => c.dialCode === formData.country_code) || COUNTRIES[0];

  // Filter counselors for search
  const filteredCounselors = counselors.filter((c: any) =>
    c.name.toLowerCase().includes(counselorSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(counselorSearch.toLowerCase()),
  );

  const selectedCounselorName = counselors.find((c: any) => c.id === formData.assigned_to)?.name;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      custom_data: {
        ...prev.custom_data,
        [field]: value,
      },
    }));
  };

  const handleCheckboxOptionToggle = (fieldName: string, opt: string) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.custom_data?.[fieldName])
        ? [...prev.custom_data[fieldName]]
        : prev.custom_data?.[fieldName]
        ? [prev.custom_data[fieldName]]
        : [];
      const exists = current.includes(opt);
      const updated = exists ? current.filter((x: string) => x !== opt) : [...current, opt];
      return {
        ...prev,
        custom_data: {
          ...prev.custom_data,
          [fieldName]: updated,
        },
      };
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoFileName(file.name);
    }
  };

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const fullPhone = `${payload.country_code} ${payload.phone}`.trim();
      // If user typed custom "lead from", save that or selected
      const finalLeadFrom = payload.lead_from_custom.trim()
        ? payload.lead_from_custom.trim()
        : payload.lead_from;

      const res = await api.post('/leads', {
        ...payload,
        phone: fullPhone,
        lead_from: finalLeadFrom,
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Lead created successfully and saved in database!');
      setErrorMsg('');
      setTimeout(() => {
        navigate('/crm/all-leads');
      }, 1200);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create lead. Please check required fields.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!formData.first_name.trim() || !formData.phone.trim()) {
      setErrorMsg('First Name and Phone Number are required.');
      return;
    }

    createLeadMutation.mutate(formData);
  };

  // Complete clean reset (including photo and inputs)
  const confirmReset = () => {
    setFormData(initialForm);
    setPhotoFile(null);
    setPhotoFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCounselorSearch('');
    setCountrySearch('');
    setShowResetModal(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Outside click listeners
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
      if (counselorRef.current && !counselorRef.current.contains(e.target as Node)) {
        setCounselorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <CrmLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-500 font-bold ml-2">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 text-xs rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Banner */}
            <div className="bg-[#0b3b75] px-6 py-3.5">
              <h2 className="text-base font-bold text-white tracking-wide">
                Add Lead
              </h2>
            </div>

            <div className="p-8 space-y-7">
              {/* Row 1: Branch, Phone with Country Selector, First Name, Middle Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Branch</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                    ))}
                  </select>
                </div>

                {/* Country Flag & Dial Code Dropdown + Phone Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-lg border border-slate-300 bg-slate-50 focus-within:border-blue-600 focus-within:bg-white" ref={countryRef}>
                    <button
                      type="button"
                      onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      className="inline-flex items-center gap-1.5 px-3 text-xs text-slate-700 border-r border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <span>{selectedCountry.flag}</span>
                      <span className="font-mono">{selectedCountry.dialCode}</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <input
                      type="tel"
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none font-mono"
                    />

                    {/* Country Picker Dropdown */}
                    {countryDropdownOpen && (
                      <div className="absolute left-0 top-11 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2">
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                          autoFocus
                        />
                        <div className="max-h-52 overflow-y-auto space-y-1 text-xs">
                          {filteredCountries.map((c) => (
                            <div
                              key={c.code}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, country_code: c.dialCode }));
                                setCountryDropdownOpen(false);
                              }}
                              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                                formData.country_code === c.dialCode ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{c.flag}</span>
                                <span className="truncate max-w-[130px]">{c.name}</span>
                              </div>
                              <span className="font-mono text-slate-500 text-[11px]">{c.dialCode}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter First Name"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    placeholder="Enter Middle Name"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Row 2: Last Name, Email, Gender, Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter Last Name"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter Email"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Row 3: City, Lead Received On (Expanded), Lead Status (Cleaned), Lead From with custom textbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter City"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Lead Received On - Channels directly from DB */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lead Received On</label>
                  <select
                    name="lead_received_on"
                    value={formData.lead_received_on}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                  >
                    <option value="">Select Lead Received On</option>
                    {receivedChannels.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Status - Cleaned DB list (No duplicate NEW, no UNWORKED) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lead Status</label>
                  <select
                    name="status_id"
                    value={formData.status_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                  >
                    <option value="">Select Lead Status</option>
                    {statuses.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Lead From - Select Dropdown + Enter Lead From TextBox side-by-side (As in user's image) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lead From</label>
                  <div className="flex gap-2">
                    <select
                      name="lead_from"
                      value={formData.lead_from}
                      onChange={handleChange}
                      className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                    >
                      {leadSources.map((ls: any) => (
                        <option key={ls.id} value={ls.name}>{ls.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="lead_from_custom"
                      value={formData.lead_from_custom}
                      onChange={handleChange}
                      placeholder="Enter Lead From"
                      className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Campaign, Remark, Refer */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Campaign</label>
                  <select
                    name="campaign_id"
                    value={formData.campaign_id}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                  >
                    <option value="">Select Campaign</option>
                    {campaigns.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remark</label>
                  <textarea
                    rows={2}
                    name="remark"
                    value={formData.remark}
                    onChange={handleChange}
                    placeholder="Enter Remark"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Refer</label>
                  <input
                    type="text"
                    name="refer_by"
                    value={formData.refer_by}
                    onChange={handleChange}
                    placeholder="Enter Refer"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Dynamic Custom Fields direct from Database (Form Fields) */}
              {customFields && customFields.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {customFields.map((field: any) => {
                      const opts: string[] = Array.isArray(field.options)
                        ? field.options
                        : typeof field.options === 'string'
                        ? field.options.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];

                      const val = formData.custom_data?.[field.name] ?? '';

                      return (
                        <div key={field.id || field.name} className={field.input_type === 'textarea' ? 'sm:col-span-2 lg:col-span-4' : ''}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>

                          {/* Text input */}
                          {field.input_type === 'text' && (
                            <input
                              type="text"
                              required={field.required}
                              placeholder={`Enter ${field.label}`}
                              value={val}
                              onChange={(e) => handleCustomChange(field.name, e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                            />
                          )}

                          {/* Number input */}
                          {field.input_type === 'number' && (
                            <input
                              type="number"
                              required={field.required}
                              placeholder={`Enter ${field.label}`}
                              value={val}
                              onChange={(e) => handleCustomChange(field.name, e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                            />
                          )}

                          {/* Date input */}
                          {field.input_type === 'date' && (
                            <input
                              type="date"
                              required={field.required}
                              value={val}
                              onChange={(e) => handleCustomChange(field.name, e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                            />
                          )}

                          {/* Textarea */}
                          {field.input_type === 'textarea' && (
                            <textarea
                              rows={2}
                              required={field.required}
                              placeholder={`Enter ${field.label}`}
                              value={val}
                              onChange={(e) => handleCustomChange(field.name, e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                            />
                          )}

                          {/* Select dropdown */}
                          {field.input_type === 'select' && (
                            <select
                              required={field.required}
                              value={val}
                              onChange={(e) => handleCustomChange(field.name, e.target.value)}
                              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-medium"
                            >
                              <option value="">Select {field.label}</option>
                              {opts.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {/* Radio options */}
                          {field.input_type === 'radio' && (
                            <div className="flex flex-wrap items-center gap-4 pt-1.5">
                              {opts.map((opt: string) => (
                                <label key={opt} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`custom_radio_${field.name}`}
                                    value={opt}
                                    checked={val === opt}
                                    onChange={() => handleCustomChange(field.name, opt)}
                                    className="text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Checkbox */}
                          {field.input_type === 'checkbox' && (
                            opts.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-4 pt-1.5">
                                {opts.map((opt: string) => {
                                  const isChecked = Array.isArray(val)
                                    ? val.includes(opt)
                                    : val === opt;
                                  return (
                                    <label key={opt} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleCheckboxOptionToggle(field.name, opt)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-1.5">
                                <input
                                  type="checkbox"
                                  id={`cb_${field.name}`}
                                  checked={!!val}
                                  onChange={(e) => handleCustomChange(field.name, e.target.checked)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor={`cb_${field.name}`} className="text-xs text-slate-700 cursor-pointer">
                                  {field.label}
                                </label>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call Time Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Call Time
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Followup Date</label>
                <input
                  type="date"
                  name="next_followup_date"
                  value={formData.next_followup_date}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">From</label>
                <input
                  type="time"
                  name="followup_time_from"
                  value={formData.followup_time_from}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">To</label>
                <input
                  type="time"
                  name="followup_time_to"
                  value={formData.followup_time_to}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Lead Assign Search Dropdown */}
              <div className="relative" ref={counselorRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lead assign</label>
                <div
                  onClick={() => setCounselorDropdownOpen(!counselorDropdownOpen)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white cursor-pointer flex items-center justify-between"
                >
                  <span className={selectedCounselorName ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
                    {selectedCounselorName || 'Select Counselor'}
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {counselorDropdownOpen && (
                  <div className="absolute left-0 right-0 top-16 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Search Manager / Agent..."
                      value={counselorSearch}
                      onChange={(e) => setCounselorSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:outline-none focus:bg-white"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                      {filteredCounselors.length > 0 ? (
                        filteredCounselors.map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, assigned_to: c.id }));
                              setCounselorDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                              formData.assigned_to === c.id
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{c.name}</span>
                            <span className="text-[10px] uppercase text-slate-400">{c.role}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-slate-400 text-center">No counselors found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Followup Remark & Photo File Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lead FollowUp Remark</label>
                <input
                  type="text"
                  name="followup_remark"
                  value={formData.followup_remark}
                  onChange={handleChange}
                  placeholder="Enter followup discussion notes..."
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {photoFileName && (
                  <p className="text-[11px] text-blue-600 mt-1 truncate">Selected: {photoFileName}</p>
                )}
              </div>
            </div>

            {/* Bottom Actions: Reset, Cancel, Save */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => navigate('/crm/all-leads')}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLeadMutation.isPending}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#0b3b75] hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {createLeadMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        {/* Confirmation Modal for Reset */}
        {showResetModal && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
                !
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Are you sure want to restore?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This will clear all filled data in the form, remove uploaded photo, and reset everything to defaults.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  No, Keep Data
                </button>
                <button
                  type="button"
                  onClick={confirmReset}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Yes, Reset All
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CrmLayout>
  );
};

export default AddLeadPage;
