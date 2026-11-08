import React, { useState, useEffect } from 'react';
import { CrmLayout } from '../../components/layout/CrmLayout';
import apiClient from '../../lib/api';

export const TodayBirthdayPage: React.FC = () => {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/leads', {
        params: {
          birthday_date: selectedDate,
          limit: 100,
        },
      });
      const data = res.data?.data || {};
      const fetchedRecords = data.records || data.leads || [];
      setBirthdays(fetchedRecords);
    } catch (err) {
      console.error('Failed to fetch birthdays', err);
      setBirthdays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, [selectedDate]);

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  };

  const openWhatsAppWish = (phone: string, name: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Dear ${name || 'Customer'},\nWishing you a very Happy Birthday! May your day be filled with happiness and the coming year with success.\n\nWarm regards,\nTeam`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    window.open(`tel:${phone}`);
  };

  const formatBirthDisplay = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const day = d.getDate();
    const daySuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    return `Born on ${months[d.getMonth()]} ${day}${daySuffix(day)}, ${d.getFullYear()}`;
  };

  return (
    <CrmLayout>
      <div className="space-y-4">
        {/* Header Bar with Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Today's Birthdays</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Filter by date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            <button
              onClick={handleSetToday}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#e05638] hover:bg-[#c94529] rounded transition-colors shadow-sm"
            >
              Today
            </button>
          </div>
        </div>

        {/* Count Summary */}
        <div className="text-xs font-medium text-slate-500">
          {birthdays.length} {birthdays.length === 1 ? 'person' : 'people'} celebrating today
        </div>

        {/* Birthday Content Cards or Empty View */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            Checking celebrations...
          </div>
        ) : birthdays.length === 0 ? (
          /* Exact Match to Screenshot 4: Empty Birthday State */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-24 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-3 text-slate-300">
              {/* Grey Cake Icon from Screenshot 4 */}
              <svg className="w-9 h-9 fill-slate-300" viewBox="0 0 24 24">
                <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5c0 .35-.12.67-.32.93l.32.57H15a1 1 0 0 1 1 1v1h-8V6a1 1 0 0 1 1-1h1.5l.32-.57c-.2-.26-.32-.58-.32-.93A1.5 1.5 0 0 1 12 2zm7 7v4H5V9h14zm-14 6h14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5z" />
              </svg>
            </div>
            <p className="text-slate-500 text-base font-normal">No birthdays to celebrate today</p>
          </div>
        ) : (
          /* Match to Screenshot 2: Birthday Row Card */
          <div className="space-y-3">
            {birthdays.map((person) => (
              <div
                key={person.id}
                className="bg-[#fcfbee] border border-[#f5efc5] rounded-xl p-4 flex items-center justify-between shadow-xs hover:shadow-sm transition-shadow"
              >
                {/* Left side: Yellow circle cake icon + Details */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-600 shadow-inner">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{person.name}</h3>
                      <span className="bg-amber-100 text-amber-900 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-amber-200">
                        <svg className="w-3 h-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>Birthday</span>
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 font-medium mt-0.5">
                      {person.phone || 'No phone'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatBirthDisplay(person.date_of_birth)}
                    </div>
                  </div>
                </div>

                {/* Right side: Blue Phone Dial Button & Green WhatsApp Button */}
                <div className="flex items-center gap-3">
                  {/* Blue Phone Call Button */}
                  <button
                    onClick={() => handleCall(person.phone)}
                    title="Call"
                    className="w-10 h-10 rounded-full bg-[#1e78f0] hover:bg-[#1565d8] text-white flex items-center justify-center shadow-md transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
                    </svg>
                  </button>

                  {/* Green WhatsApp Button */}
                  <button
                    onClick={() => openWhatsAppWish(person.phone, person.name)}
                    title="Send WhatsApp Birthday Greeting"
                    className="w-10 h-10 rounded-full bg-[#25d366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-md transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.573 1.956.883 2.806.883 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.518-4.482 10-10 10-1.748 0-3.385-.45-4.819-1.238l-7.181 1.88 1.914-6.985c-.876-1.488-1.381-3.228-1.381-5.087 0-5.518 4.482-10 10-10s10 4.482 10 10z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CrmLayout>
  );
};

export default TodayBirthdayPage;
