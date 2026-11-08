import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface FormFieldItem {
  id: string;
  name: string;
  label: string;
  input_type: string;
  required: boolean;
  options: string[] | null;
  default_value: string;
  sort_order?: number;
  created_at?: string;
}

const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'textarea', label: 'Textarea' },
];

export const FormFieldsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Modal states: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [activeField, setActiveField] = useState<FormFieldItem | null>(null);

  // Form input states
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [inputType, setInputType] = useState('text');
  const [isRequired, setIsRequired] = useState(false);
  const [optionsStr, setOptionsStr] = useState('');
  const [defaultValue, setDefaultValue] = useState('');

  // Notification state
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch form fields from real database
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['form-fields'],
    queryFn: async () => {
      const res = await api.get('/form-fields');
      return res.data?.data || [];
    },
  });

  const fields: FormFieldItem[] = fieldsData || [];

  // Reset form inputs
  const resetForm = () => {
    setFieldName('');
    setFieldLabel('');
    setInputType('text');
    setIsRequired(false);
    setOptionsStr('');
    setDefaultValue('');
    setActiveField(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
  };

  const openEditModal = (field: FormFieldItem) => {
    setActiveField(field);
    setFieldName(field.name || '');
    setFieldLabel(field.label || '');
    setInputType(field.input_type || 'text');
    setIsRequired(!!field.required);
    setDefaultValue(field.default_value === '-' ? '' : field.default_value || '');

    // Format options as comma-separated string
    if (Array.isArray(field.options)) {
      setOptionsStr(field.options.join(', '));
    } else {
      setOptionsStr('');
    }

    setModalMode('edit');
  };

  const closeModal = () => {
    resetForm();
    setModalMode(null);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/form-fields', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-fields'] });
      queryClient.invalidateQueries({ queryKey: ['lead-options'] });
      setAlertMessage({ text: 'Form field created successfully', type: 'success' });
      closeModal();
    },
    onError: (err: any) => {
      setAlertMessage({
        text: err.response?.data?.message || 'Failed to create form field',
        type: 'error',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.patch(`/form-fields/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-fields'] });
      queryClient.invalidateQueries({ queryKey: ['lead-options'] });
      setAlertMessage({ text: 'Form field updated successfully', type: 'success' });
      closeModal();
    },
    onError: (err: any) => {
      setAlertMessage({
        text: err.response?.data?.message || 'Failed to update form field',
        type: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/form-fields/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-fields'] });
      queryClient.invalidateQueries({ queryKey: ['lead-options'] });
      setAlertMessage({ text: 'Form field deleted successfully', type: 'success' });
    },
    onError: (err: any) => {
      setAlertMessage({
        text: err.response?.data?.message || 'Failed to delete form field',
        type: 'error',
      });
    },
  });

  const handleDelete = (field: FormFieldItem) => {
    if (window.confirm(`Are you sure you want to delete form field "${field.label || field.name}"?`)) {
      deleteMutation.mutate(field.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) {
      alert('Please enter a field name');
      return;
    }

    const payload: any = {
      name: fieldName.trim(),
      label: fieldLabel.trim() || fieldName.trim(),
      input_type: inputType,
      required: isRequired,
      default_value: defaultValue.trim() || null,
    };

    if (['select', 'checkbox', 'radio'].includes(inputType)) {
      payload.options = optionsStr;
    } else {
      payload.options = null;
    }

    if (modalMode === 'add') {
      createMutation.mutate(payload);
    } else if (modalMode === 'edit' && activeField) {
      updateMutation.mutate({ id: activeField.id, payload });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <CrmLayout>
      <div className="space-y-4">
        {/* Success / Error Notification */}
        {alertMessage && (
          <div
            className={`p-3.5 rounded-lg text-sm font-medium flex items-center justify-between animate-in fade-in ${
              alertMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{alertMessage.text}</span>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section Header with + Add Field Button (Matching Screenshot 1) */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Form Fields</h2>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#0b3b75] hover:bg-[#082a54] rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            + Add Field
          </button>
        </div>

        {/* Form Fields Data Table (Matching Screenshot 1) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50">
                <th className="py-3.5 px-5">NAME</th>
                <th className="py-3.5 px-5">LABEL</th>
                <th className="py-3.5 px-5">INPUT TYPE</th>
                <th className="py-3.5 px-5">REQUIRED</th>
                <th className="py-3.5 px-5">OPTIONS</th>
                <th className="py-3.5 px-5">DEFAULT VALUE</th>
                <th className="py-3.5 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading form fields...</span>
                    </div>
                  </td>
                </tr>
              ) : fields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    No form fields configured yet. Click "+ Add Field" to create one.
                  </td>
                </tr>
              ) : (
                fields.map((field) => (
                  <tr key={field.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* NAME */}
                    <td className="py-3.5 px-5 font-medium text-slate-800">{field.name}</td>

                    {/* LABEL */}
                    <td className="py-3.5 px-5 text-slate-700">{field.label}</td>

                    {/* INPUT TYPE */}
                    <td className="py-3.5 px-5">
                      <span className="text-slate-600 lowercase font-medium">{field.input_type}</span>
                    </td>

                    {/* REQUIRED */}
                    <td className="py-3.5 px-5">
                      <span className={field.required ? 'font-semibold text-rose-600' : 'text-slate-600'}>
                        {field.required ? 'Yes' : 'No'}
                      </span>
                    </td>

                    {/* OPTIONS */}
                    <td className="py-3.5 px-5">
                      {Array.isArray(field.options) && field.options.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {field.options.map((opt, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* DEFAULT VALUE */}
                    <td className="py-3.5 px-5 text-slate-600">
                      {field.default_value && field.default_value !== '-' ? field.default_value : '-'}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-3">
                        {/* Edit Pen Button */}
                        <button
                          onClick={() => openEditModal(field)}
                          title="Edit Form Field"
                          className="text-emerald-700 hover:text-emerald-800 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Delete Trash Button */}
                        <button
                          onClick={() => handleDelete(field)}
                          title="Delete Form Field"
                          className="text-rose-600 hover:text-rose-700 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ======================================================== */}
        {/* ADD & UPDATE FORM FIELD MODALS (Matching Screenshots 2, 3, 4) */}
        {/* ======================================================== */}
        {modalMode && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
              {/* Header: Dark Blue Header with Title & Close Icon */}
              <div className="bg-[#003884] px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-bold text-base tracking-tight">
                  {modalMode === 'add' ? 'Add Form Field' : 'Update Form Field'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white/80 hover:text-white text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter field name"
                    value={fieldName}
                    onChange={(e) => {
                      setFieldName(e.target.value);
                      if (modalMode === 'add' && !fieldLabel) {
                        setFieldLabel(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Label */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Label</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter field label"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Input Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Input Type</label>
                  <select
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs capitalize"
                  >
                    {INPUT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Options (For Select, Checkbox, Radio) */}
                {['select', 'checkbox', 'radio'].includes(inputType) && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Options (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Option 1, Option 2, Option 3"
                      value={optionsStr}
                      onChange={(e) => setOptionsStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Separate each option with a comma.
                    </p>
                  </div>
                )}

                {/* Required Field Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="requiredField"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="requiredField" className="font-semibold text-slate-700 cursor-pointer select-none">
                    Required Field
                  </label>
                </div>

                {/* Default Value */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Default Value</label>
                  <input
                    type="text"
                    placeholder="Enter default value"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {/* Footer Buttons: Close & Add/Update */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#003884] hover:bg-[#002b66] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : modalMode === 'add' ? 'Add' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </CrmLayout>
  );
};

export default FormFieldsPage;
