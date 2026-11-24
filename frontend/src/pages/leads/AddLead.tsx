import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';
import { COUNTRIES } from '../../lib/countries';

const AddLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    photo_url: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [rawImage, setRawImage] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

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

  // Canvas cropper redraw
  const drawCropCanvas = (
    img: HTMLImageElement,
    zoom: number,
    pan: { x: number; y: number },
    rotation: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    const center = size / 2;
    const radius = 120; // 240px diameter circle

    ctx.clearRect(0, 0, size, size);

    // Draw dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Calculate base scale so image covers the 240px circle
    const baseScale = Math.max((radius * 2) / img.naturalWidth, (radius * 2) / img.naturalHeight);

    ctx.save();
    ctx.translate(center + pan.x, center + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    const s = baseScale * zoom;
    ctx.scale(s, s);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Draw circular mask overlay (darkens area outside crop circle)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(center, center, radius, 0, Math.PI * 2, true); // counter-clockwise cut out
    ctx.fill();

    // Circle border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Dotted alignment grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center, center + radius);
    ctx.moveTo(center - radius, center);
    ctx.lineTo(center + radius, center);
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    if (!isCropModalOpen || !rawImage) return;

    if (imageObjRef.current && imageObjRef.current.src === rawImage) {
      drawCropCanvas(imageObjRef.current, cropZoom, cropPan, cropRotation);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImage;
    img.onload = () => {
      imageObjRef.current = img;
      drawCropCanvas(img, cropZoom, cropPan, cropRotation);
    };
  }, [isCropModalOpen, rawImage, cropZoom, cropPan, cropRotation]);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Debounced check for duplicate phone number
  useEffect(() => {
    const rawDigits = formData.phone.replace(/\D/g, '');
    if (rawDigits.length < 5) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicate(true);
        const fullPhone = `${formData.country_code || '+91'} ${formData.phone}`.trim();
        const res = await api.get('/leads/check-duplicate', {
          params: { phone: fullPhone },
        });
        if (res.data?.duplicate && res.data?.lead) {
          const l = res.data.lead;
          setDuplicateWarning(
            `⚠️ Already lead exist with this number (${l.phone}) as "${l.name}" (Lead #${l.lead_number})!`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        // ignore check errors
      } finally {
        setCheckingDuplicate(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.country_code]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setRawImage(reader.result as string);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
        setCropRotation(0);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleApplyCrop = () => {
    const img = imageObjRef.current;
    if (!img) return;

    const exportSize = 320;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const center = exportSize / 2;
    const radius = exportSize / 2;
    const previewRadius = 120;
    const ratio = radius / previewRadius;
    const baseScale = Math.max((previewRadius * 2) / img.naturalWidth, (previewRadius * 2) / img.naturalHeight);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(center + cropPan.x * ratio, center + cropPan.y * ratio);
    ctx.rotate((cropRotation * Math.PI) / 180);
    const s = baseScale * cropZoom * ratio;
    ctx.scale(s, s);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    const croppedDataUrl = exportCanvas.toDataURL('image/png');
    setPhotoPreview(croppedDataUrl);
    setFormData((prev) => ({ ...prev, photo_url: croppedDataUrl }));
    setIsCropModalOpen(false);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    setRawImage('');
    setFormData((prev) => ({ ...prev, photo_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setCropPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - cropPan.x,
        y: e.touches[0].clientY - cropPan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setCropPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const fullPhone = `${payload.country_code || '+91'} ${payload.phone}`.trim();
      // If user typed custom "lead from", save that or selected
      const finalLeadFrom = payload.lead_from_custom?.trim()
        ? payload.lead_from_custom.trim()
        : payload.lead_from;

      // Construct a clean DTO payload with no empty strings or unwhitelisted keys
      const cleanData: Record<string, any> = {
        first_name: payload.first_name.trim(),
        phone: fullPhone,
      };

      if (payload.middle_name?.trim()) cleanData.middle_name = payload.middle_name.trim();
      if (payload.last_name?.trim()) cleanData.last_name = payload.last_name.trim();
      if (payload.email?.trim()) cleanData.email = payload.email.trim();
      if (payload.branch_id?.trim() && payload.branch_id !== 'all') cleanData.branch_id = payload.branch_id.trim();
      if (payload.gender?.trim()) cleanData.gender = payload.gender.trim();
      if (payload.date_of_birth?.trim()) cleanData.date_of_birth = payload.date_of_birth.trim();
      if (payload.city?.trim()) cleanData.city = payload.city.trim();
      if (payload.address?.trim()) cleanData.address = payload.address.trim();
      if (payload.feedback?.trim()) cleanData.feedback = payload.feedback.trim();
      if (payload.lead_received_on?.trim()) cleanData.lead_received_on = payload.lead_received_on.trim();
      if (payload.status_id?.trim() && payload.status_id !== 'all') cleanData.status_id = payload.status_id.trim();
      if (finalLeadFrom?.trim()) cleanData.lead_from = finalLeadFrom.trim();
      if (payload.campaign_id?.trim() && payload.campaign_id !== 'all') cleanData.campaign_id = payload.campaign_id.trim();
      if (payload.remark?.trim()) cleanData.remark = payload.remark.trim();
      if (payload.refer_by?.trim()) cleanData.refer_by = payload.refer_by.trim();
      if (payload.custom_data && Object.keys(payload.custom_data).length > 0) cleanData.custom_data = payload.custom_data;
      if (payload.next_followup_date?.trim()) cleanData.next_followup_date = payload.next_followup_date.trim();
      if (payload.followup_time_from?.trim()) cleanData.followup_time_from = payload.followup_time_from.trim();
      if (payload.followup_time_to?.trim()) cleanData.followup_time_to = payload.followup_time_to.trim();
      if (payload.assigned_to?.trim() && payload.assigned_to !== 'all') cleanData.assigned_to = payload.assigned_to.trim();
      if (payload.followup_remark?.trim()) cleanData.followup_remark = payload.followup_remark.trim();
      if (payload.photo_url?.trim()) cleanData.photo_url = payload.photo_url.trim();

      const res = await api.post('/leads', cleanData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate queries across CRM so that newly created lead shows immediately everywhere without manual browser refresh
      queryClient.invalidateQueries({ queryKey: ['leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['today-followups'] });
      queryClient.invalidateQueries({ queryKey: ['all-followups'] });
      queryClient.invalidateQueries();

      setSuccessMsg('Lead created successfully and saved in database!');
      setErrorMsg('');
      setTimeout(() => {
        navigate('/crm/all-leads');
      }, 700);
    },
    onError: (err: any) => {
      const backendMsg = err.response?.data?.message;
      const formatted = Array.isArray(backendMsg)
        ? backendMsg.join(' • ')
        : backendMsg || 'Failed to create lead. Please check required fields.';
      setErrorMsg(formatted);
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

    if (duplicateWarning) {
      setErrorMsg(duplicateWarning);
      return;
    }

    createLeadMutation.mutate(formData);
  };

  // Complete clean reset (including photo and inputs)
  const confirmReset = () => {
    setFormData(initialForm);
    setPhotoPreview('');
    setRawImage('');
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
              {/* Lead Profile Photo (Circular Avatar with Crop) */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-slate-50 border border-blue-100/80">
                {/* Circular Avatar Container */}
                <div className="relative group flex-shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-dashed border-blue-300 hover:border-[#003884] bg-white flex items-center justify-center cursor-pointer transition-all shadow-sm group-hover:shadow-md relative"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Lead Avatar Preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-[#003884] transition-colors p-2 text-center">
                        <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-[10px] font-bold mt-0.5">Upload Photo</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[9px] font-bold mt-0.5">{photoPreview ? 'Change' : 'Crop & Add'}</span>
                    </div>
                  </div>

                  {/* Floating Camera Button Badge */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload / Change Photo"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#003884] text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer border-2 border-white"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>

                {/* Details & Actions */}
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Lead Profile Photo</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload customer profile image. Circular cropping tool will open automatically.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#003884] text-white hover:bg-blue-800 transition-colors cursor-pointer shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {rawImage && (
                        <button
                          type="button"
                          onClick={() => setIsCropModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <span>Crop / Adjust</span>
                        </button>
                      )}

                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Supports JPG, PNG, WEBP. Max file size: 5MB.
                  </p>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

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
                              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${formData.country_code === c.dialCode ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
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
                  {/* Duplicate Phone Alert Indicator */}
                  {checkingDuplicate && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">Checking duplicate...</p>
                  )}
                  {duplicateWarning && (
                    <div className="mt-1.5 p-2 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-medium leading-tight shadow-2xs animate-in fade-in">
                      {duplicateWarning}
                    </div>
                  )}
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
              Follow Up
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
                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${formData.assigned_to === c.id
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

            {/* Followup Remark */}
            <div className="pt-2 border-t border-slate-100">
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

        {/* Interactive Photo Crop Modal */}
        {isCropModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Crop Profile Photo</h3>
                  <p className="text-xs text-slate-500">Drag image to position & use slider to zoom</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Interactive Canvas Area */}
              <div className="flex justify-center select-none">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={320}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="rounded-xl shadow-md cursor-grab active:cursor-grabbing border border-slate-700 touch-none"
                  style={{ width: '320px', height: '320px' }}
                />
              </div>

              {/* Controls: Zoom slider & Rotate */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                    Zoom
                  </span>
                  <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                    <button
                      type="button"
                      onClick={() => setCropZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setCropZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 w-10 text-right">{cropZoom.toFixed(1)}x</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setCropRotation((r) => (r + 90) % 360)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Rotate 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCropZoom(1);
                      setCropPan({ x: 0, y: 0 });
                      setCropRotation(0);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    Reset Position
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#003884] hover:bg-blue-800 text-white shadow-sm transition-colors cursor-pointer"
                >
                  Crop & Save Photo
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
