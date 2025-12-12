
import React, { useState, useEffect } from 'react';
import { digitizePrescription } from '../services/geminiService';
import { saveTemplate, getAllTemplates, deleteTemplate, getSettings, saveRecord, getDoctorProfile, getUniquePatients } from '../services/db';
import { PrescriptionItem, PrescriptionTemplate, PrescriptionSettings, DoctorProfile, PatientVitals, PatientRecord } from '../types';
import { FileSignature, ScanLine, Printer, Save, Trash, Plus, CheckCircle, Search, LayoutTemplate, Activity, UserPlus, Stethoscope, ArrowLeft, X, Phone, Scale, AlertCircle, WifiOff } from 'lucide-react';

interface PrescriptionProps {
  initialRecord: PatientRecord | null;
}

const Prescription: React.FC<PrescriptionProps> = ({ initialRecord }) => {
  const [viewMode, setViewMode] = useState<'landing' | 'editor'>('landing');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [diagnosis, setDiagnosis] = useState('');
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  
  const [vitals, setVitals] = useState<PatientVitals>({
    bloodPressure: '', heartRate: '', temperature: '', spO2: '', weight: '', height: '', respiratoryRate: '', bloodSugar: ''
  });
  
  const [settings, setSettings] = useState<PrescriptionSettings>({
    topPadding: 50, fontSize: 14, fontFamily: 'Vazirmatn', printBackground: true, paperSize: 'A4', elements: []
  });
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // New Patient Form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'male' | 'female'>('male');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientWeight, setNewPatientWeight] = useState('');
  const [newPatientHistory, setNewPatientHistory] = useState('');
  const [newPatientAllergies, setNewPatientAllergies] = useState('');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (initialRecord) {
        handleSelectPatient(initialRecord);
    }
  }, [initialRecord]);

  const loadInitialData = async () => {
    try {
      const templatesData = await getAllTemplates();
      setTemplates(templatesData);
      
      const patientsData = await getUniquePatients();
      setAllPatients(patientsData);

      const s = await getSettings();
      if (s) setSettings(s);
      const p = await getDoctorProfile();
      if (p) setDoctorProfile(p);
    } catch (e) { console.error(e); }
  };

  const filteredPatients = allPatients.filter(p => p.name.includes(searchTerm));

  const handleSelectPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setViewMode('editor');
    setItems([]);
    
    // Auto-fill Logic
    if (patient.diagnosis && patient.status === 'diagnosed') {
        setDiagnosis(patient.diagnosis.modern.diagnosis);
        
        // Convert AI treatment plan string array to prescription items
        const aiItems = patient.diagnosis.modern.treatmentPlan.map(plan => ({
            drug: plan,
            dosage: '',
            instruction: ''
        }));
        setItems(aiItems);

        // Add traditional items if desired, or keep separate. For now, adding modern.
    } else {
        setDiagnosis(patient.chiefComplaint || '');
    }

    setVitals(patient.vitals || { bloodPressure: '', heartRate: '', temperature: '', spO2: '', weight: '', height: '', respiratoryRate: '', bloodSugar: '' });
  };

  const handleRegisterPatient = async () => {
    if (!newPatientName) return;
    const newRecord: PatientRecord = {
      id: crypto.randomUUID(),
      name: newPatientName,
      age: newPatientAge,
      gender: newPatientGender,
      phoneNumber: newPatientPhone,
      chiefComplaint: 'ثبت نام اولیه (مستقیم)',
      history: newPatientHistory,
      allergies: newPatientAllergies,
      vitals: { 
        bloodPressure: '', 
        heartRate: '', 
        temperature: '', 
        spO2: '', 
        weight: newPatientWeight, 
        height: '',
        respiratoryRate: '',
        bloodSugar: ''
      },
      visitDate: Date.now(),
      status: 'waiting'
    };
    
    await saveRecord(newRecord);
    setShowNewPatientModal(false);
    
    // Reset form
    setNewPatientName('');
    setNewPatientAge('');
    setNewPatientGender('male');
    setNewPatientPhone('');
    setNewPatientWeight('');
    setNewPatientHistory('');
    setNewPatientAllergies('');
    
    loadInitialData(); 
    handleSelectPatient(newRecord); 
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const res = await digitizePrescription(e.target.files[0]);
        if (res.items) setItems(res.items);
        
        if (res.diagnosis) {
          setDiagnosis(res.diagnosis);
        }

        if (res.vitals) {
           setVitals(prev => ({
             ...prev,
             bloodPressure: res.vitals?.bloodPressure || prev.bloodPressure,
             heartRate: res.vitals?.heartRate || prev.heartRate,
             temperature: res.vitals?.temperature || prev.temperature,
             spO2: res.vitals?.spO2 || prev.spO2,
             weight: res.vitals?.weight || prev.weight,
             height: res.vitals?.height || prev.height,
             respiratoryRate: res.vitals?.respiratoryRate || prev.respiratoryRate,
             bloodSugar: res.vitals?.bloodSugar || prev.bloodSugar,
           }));
        }

      } catch (e) {
        console.error(e);
        alert('خطا در اسکن نسخه');
      } finally {
        setLoading(false);
      }
    }
  };

  const addItem = () => {
    setItems([...items, { drug: '', dosage: '', instruction: '' }]);
  };

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async () => {
    if (!templateName) return;
    try {
      await saveTemplate({
        id: crypto.randomUUID(),
        name: templateName,
        items
      });
      setShowSaveModal(false);
      setTemplateName('');
      loadInitialData();
    } catch (e) { console.error(e); }
  };

  const loadTemplate = (t: PrescriptionTemplate) => {
    setItems(t.items);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) {
      await deleteTemplate(id);
      loadInitialData();
    }
  };

  const handlePrint = (mode: 'plain' | 'custom') => {
     saveToPatientRecord();

     const win = window.open('', '', 'width=900,height=1200');
     if (!win) return;

     let style = `
       @page { size: ${settings.paperSize || 'A4'}; margin: 0; }
       body { font-family: '${settings.fontFamily}', sans-serif; margin: 0; direction: rtl; }
       
       /* Digital Mode Styles */
       .rx-container { padding: 40px; }
       .rx-table { width: 100%; border-collapse: collapse; margin-top: 20px; direction: ltr; }
       .rx-table th, .rx-table td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
       .rx-table th { background-color: #f8f9fa; }
       
       .rx-symbol { font-size: 32px; font-weight: bold; margin: 20px 0; font-family: serif; }
       .digital-header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
       
       /* Custom Layout Mode Styles */
       .custom-container { position: relative; width: 100%; height: 100vh; overflow: hidden; }
       .print-element { position: absolute; }
     `;

     let content = '';

     if (mode === 'plain') {
        content = `
          <div class="rx-container">
             <div class="digital-header">
                <div class="doc-info">
                   <h1 style="margin:0; font-size:24px;">${doctorProfile?.name || 'دکتر ...'}</h1>
                   <p style="margin:5px 0;">${doctorProfile?.specialty || ''}</p>
                   <p style="font-size:12px;">نظام پزشکی: ${doctorProfile?.medicalCouncilNumber || '---'}</p>
                </div>
                ${doctorProfile?.logo ? `<img src="${doctorProfile.logo}" style="height: 80px; object-fit: contain;" />` : ''}
             </div>
             
             <div style="background:#f3f4f6; padding:15px; border-radius:10px; display:flex; gap:20px; margin-bottom:20px;">
                <div><strong>نام بیمار:</strong> ${selectedPatient?.name}</div>
                ${selectedPatient?.age ? `<div><strong>سن:</strong> ${selectedPatient.age}</div>` : ''}
                <div><strong>تاریخ:</strong> ${new Date().toLocaleDateString('fa-IR')}</div>
             </div>
             
             <div style="font-size: 12px; margin-bottom: 10px; display: flex; gap: 15px; color: #555;">
                ${vitals.bloodPressure ? `<span><strong>BP:</strong> ${vitals.bloodPressure}</span>` : ''}
                ${vitals.heartRate ? `<span><strong>HR:</strong> ${vitals.heartRate}</span>` : ''}
                ${vitals.respiratoryRate ? `<span><strong>RR:</strong> ${vitals.respiratoryRate}</span>` : ''}
                ${vitals.weight ? `<span><strong>Weight:</strong> ${vitals.weight}kg</span>` : ''}
             </div>

             ${(diagnosis) ? `<div style="margin-bottom:20px; padding:10px; border:1px dashed #ccc;"><strong>تشخیص:</strong> ${diagnosis}</div>` : ''}

             <div class="rx-symbol">Rx</div>
             <table class="rx-table">
                <thead><tr><th>#</th><th>Drug Name</th><th>Dosage</th><th>Instruction</th></tr></thead>
                <tbody>
                   ${items.map((item, i) => `
                      <tr><td>${i + 1}</td><td style="font-weight:bold;">${item.drug}</td><td>${item.dosage}</td><td>${item.instruction}</td></tr>
                   `).join('')}
                </tbody>
             </table>
          </div>
        `;
     } else {
        if (settings.printBackground && settings.backgroundImage) {
           style += `
             .custom-container { 
                background-image: url('${settings.backgroundImage}'); 
                background-size: cover; 
                background-position: top center;
                background-repeat: no-repeat;
             }
           `;
        }

        const elementsHtml = (settings.elements || []).filter(el => el.visible).map(el => {
           let innerHtml = '';
           switch (el.id) {
              case 'patientName': innerHtml = selectedPatient?.name || ''; break;
              case 'age': innerHtml = selectedPatient?.age || ''; break;
              case 'date': innerHtml = new Date().toLocaleDateString('fa-IR'); break;
              case 'diagnosis': innerHtml = diagnosis; break;
              case 'vital_bp': innerHtml = vitals.bloodPressure || ''; break;
              case 'vital_hr': innerHtml = vitals.heartRate || ''; break;
              case 'vital_rr': innerHtml = vitals.respiratoryRate || ''; break;
              case 'vital_temp': innerHtml = vitals.temperature || ''; break;
              case 'vital_weight': innerHtml = vitals.weight || ''; break;
              case 'items':
                 innerHtml = `<ul style="list-style:none; padding:0; margin:0; direction: ltr; text-align: left;">
                    ${items.map((item, i) => `
                       <li style="margin-bottom:8px;">
                          <span style="font-weight:bold;">${i+1}. ${item.drug}</span>
                          <span style="margin:0 10px;">${item.dosage}</span>
                          <div style="font-size:0.9em; color:#444;">${item.instruction}</div>
                       </li>
                    `).join('')}
                 </ul>`;
                 break;
              default: innerHtml = '';
           }

           if (!innerHtml) return '';

           return `
             <div class="print-element" style="
                left: ${el.x}px; 
                top: ${el.y}px; 
                width: ${el.width}px; 
                font-size: ${el.fontSize}pt; 
                transform: rotate(${el.rotation}deg);
                text-align: ${el.align || (el.id === 'items' ? 'left' : 'right')};
             ">
                ${innerHtml}
             </div>
           `;
        }).join('');

        content = `<div class="custom-container">${elementsHtml}</div>`;
     }

     win.document.write(`
       <html dir="rtl">
         <head>
           <link href="https://fonts.googleapis.com/css2?family=Vazirmatn&display=swap" rel="stylesheet">
           <style>${style}</style>
         </head>
         <body>
           ${content}
           <script>
             window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
           </script>
         </body>
       </html>
     `);
     win.document.close();
     setShowPrintModal(false);
  };

  const saveToPatientRecord = async () => {
     if (!selectedPatient) return;
     try {
       const record: PatientRecord = {
           ...selectedPatient,
           vitals: { ...selectedPatient.vitals, ...vitals },
           status: 'completed', // Only complete when doctor prints/saves
           prescriptions: [
             ...(selectedPatient.prescriptions || []),
             {
               id: crypto.randomUUID(),
               date: Date.now(),
               items: items,
               manualDiagnosis: diagnosis,
               manualVitals: vitals
             }
           ]
       };
       
       await saveRecord(record);
     } catch (e) { console.error(e); }
  };

  if (viewMode === 'landing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in gap-8">
         
         <div className="bg-white p-12 rounded-[2rem] shadow-xl border border-blue-50 w-full max-w-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-teal-400"></div>
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
               <Stethoscope size={48} />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">میز کار نسخه نویسی</h1>
            <p className="text-gray-500 mb-10">برای شروع، نام بیمار را جستجو کنید یا از اتاق تشخیص دستور دریافت کنید</p>
            <div className="relative max-w-xl mx-auto mb-8">
               <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <Search className="text-gray-400" />
               </div>
               <input type="text" autoFocus placeholder="جستجوی نام بیمار..." className="w-full p-5 pr-12 text-lg bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               <button onClick={() => setShowNewPatientModal(true)} className="absolute top-2 left-2 bottom-2 bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-xl transition-all shadow-md" title="ثبت بیمار جدید"><UserPlus size={24} /></button>
               {searchTerm && filteredPatients.length > 0 && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-20 max-h-64 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button key={p.id} onClick={() => handleSelectPatient(p)} className="w-full text-right p-4 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex justify-between items-center transition-colors">
                        <span className="font-bold text-gray-700">{p.name}</span>
                        <span className="text-sm text-gray-400 bg-gray-100 px-2 py-1 rounded">{p.age} ساله</span>
                      </button>
                    ))}
                 </div>
               )}
            </div>
         </div>

         {showNewPatientModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowNewPatientModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600"><X /></button>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><UserPlus className="text-teal-500" />ثبت بیمار جدید</h3>
                  
                  <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-bold text-gray-600 mb-1">نام و نام خانوادگی</label>
                       <input autoFocus className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all" placeholder="مثال: علی رضایی" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} />
                     </div>

                     <div>
                       <label className="block text-sm font-bold text-gray-600 mb-1">شماره تماس</label>
                       <div className="relative">
                         <input className="w-full p-3 pl-10 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all text-left" placeholder="0912..." value={newPatientPhone} onChange={e => setNewPatientPhone(e.target.value)} dir="ltr" />
                         <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                       </div>
                     </div>

                     <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-600 mb-1">سن (سال)</label>
                          <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-center" value={newPatientAge} onChange={e => setNewPatientAge(e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-600 mb-1">جنسیت</label>
                          <div className="flex bg-gray-50 p-1 rounded-xl">
                            <button onClick={() => setNewPatientGender('male')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newPatientGender === 'male' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>آقا</button>
                            <button onClick={() => setNewPatientGender('female')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newPatientGender === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-400'}`}>خانم</button>
                          </div>
                        </div>
                     </div>

                     <div>
                       <label className="block text-sm font-bold text-gray-600 mb-1">وزن (کیلوگرم)</label>
                       <div className="relative">
                          <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-center" placeholder="kg" value={newPatientWeight} onChange={e => setNewPatientWeight(e.target.value)} />
                          <Scale className="absolute left-3 top-3 text-gray-400" size={18} />
                       </div>
                     </div>

                     <div className="pt-2">
                       <label className="flex items-center gap-2 text-sm font-bold text-orange-600 mb-1"><Activity size={16} />سابقه بیماری</label>
                       <input className="w-full p-3 bg-orange-50/50 border border-orange-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-200" placeholder="دیابت، فشار خون و..." value={newPatientHistory} onChange={e => setNewPatientHistory(e.target.value)} />
                     </div>

                     <div>
                       <label className="flex items-center gap-2 text-sm font-bold text-red-600 mb-1"><AlertCircle size={16} />حساسیت‌ها و آلرژی</label>
                       <input className="w-full p-3 bg-red-50/50 border border-red-100 rounded-xl outline-none focus:ring-2 focus:ring-red-200" placeholder="پنی‌سیلین، آسپرین..." value={newPatientAllergies} onChange={e => setNewPatientAllergies(e.target.value)} />
                     </div>

                     <button onClick={handleRegisterPatient} disabled={!newPatientName} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
                       <Save size={20} />
                       ذخیره پرونده اولیه
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('landing')} className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-50 text-gray-500"><ArrowLeft /></button>
            <FileSignature className="text-indigo-600 w-10 h-10" />
            <div><h2 className="text-3xl font-bold text-gray-800">میز کار دکتر</h2><p className="text-gray-500">پرونده: {selectedPatient?.name}</p></div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-3 space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-full">
                 <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><LayoutTemplate size={18} />قالب‌های آماده</h4>
                 {templates.length === 0 && <p className="text-sm text-gray-400">قالبی ذخیره نشده است</p>}
                 <div className="space-y-2">
                    {templates.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
                        <button onClick={() => loadTemplate(t)} className="text-sm font-bold text-gray-700 hover:text-indigo-600 flex-1 text-right">{t.name}</button>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={14} /></button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-9 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                 <div className="flex gap-6">
                    <div><span className="text-xs text-gray-400 font-bold block mb-1">نام بیمار</span><span className="font-bold text-lg text-gray-800">{selectedPatient?.name}</span></div>
                    <div><span className="text-xs text-gray-400 font-bold block mb-1">سن</span><span className="font-bold text-lg text-gray-800">{selectedPatient?.age}</span></div>
                    <div><span className="text-xs text-gray-400 font-bold block mb-1">جنسیت</span><span className="font-bold text-lg text-gray-800">{selectedPatient?.gender === 'male' ? 'آقا' : 'خانم'}</span></div>
                 </div>
                 <div className="relative overflow-hidden group">
                    <button disabled={!isOnline} className={`bg-white border text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${isOnline ? 'border-blue-200 hover:bg-blue-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {isOnline ? <ScanLine size={18} /> : <WifiOff size={18} />}
                      {loading ? '...' : isOnline ? 'اسکن نسخه' : 'آفلاین'}
                    </button>
                    {isOnline && <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleScan} disabled={loading} />}
                    {!isOnline && (
                      <div className="absolute top-full right-0 mt-2 bg-gray-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity w-48 text-center pointer-events-none">
                        اتصال اینترنت برای هوش مصنوعی برقرار نیست
                      </div>
                    )}
                 </div>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6">
                 <div className="flex items-center gap-2 mb-3 text-indigo-800 font-bold"><Activity size={18} /><span>علائم حیاتی و تشخیص</span></div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <input className="p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="BP" value={vitals.bloodPressure} onChange={e => setVitals({...vitals, bloodPressure: e.target.value})} />
                    <input className="p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="HR" value={vitals.heartRate} onChange={e => setVitals({...vitals, heartRate: e.target.value})} />
                    <input className="p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="Temp" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} />
                    <input className="p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="RR" value={vitals.respiratoryRate} onChange={e => setVitals({...vitals, respiratoryRate: e.target.value})} />
                    <input className="p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="Glu/BS" value={vitals.bloodSugar} onChange={e => setVitals({...vitals, bloodSugar: e.target.value})} />
                    <input className="p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="Weight" value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} />
                 </div>
                 <input className="w-full p-2 bg-white border border-indigo-100 rounded-lg text-sm" placeholder="تشخیص پزشک (Diagnosis)" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </div>

              <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-right">
                   <thead><tr className="border-b border-gray-200"><th className="pb-3 text-sm text-gray-500 w-10">#</th><th className="pb-3 text-sm text-gray-500 w-1/3">نام دارو (Drug)</th><th className="pb-3 text-sm text-gray-500 w-1/4">دوز (Dosage)</th><th className="pb-3 text-sm text-gray-500">دستور مصرف (Sig)</th><th className="pb-3 w-10"></th></tr></thead>
                   <tbody className="divide-y divide-gray-50">
                      {items.map((item, idx) => (
                        <tr key={idx} className="group">
                           <td className="py-3 text-gray-400 text-sm">{idx + 1}</td>
                           <td className="py-3 px-1"><input className="w-full p-2 bg-transparent focus:bg-gray-50 rounded-lg outline-none font-medium" value={item.drug} onChange={e => updateItem(idx, 'drug', e.target.value)} placeholder="نام دارو" /></td>
                           <td className="py-3 px-1"><input className="w-full p-2 bg-transparent focus:bg-gray-50 rounded-lg outline-none" value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} placeholder="دوز" /></td>
                           <td className="py-3 px-1"><input className="w-full p-2 bg-transparent focus:bg-gray-50 rounded-lg outline-none" value={item.instruction} onChange={e => updateItem(idx, 'instruction', e.target.value)} placeholder="دستور" /></td>
                           <td className="py-3 text-center"><button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500"><Trash size={16} /></button></td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
                 <button onClick={addItem} className="mt-4 text-indigo-600 font-bold text-sm flex items-center gap-1 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors"><Plus size={16} />افزودن قلم دارو</button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                 <button onClick={() => setShowSaveModal(true)} disabled={items.length === 0} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center gap-2"><Save size={18} />ذخیره در قالب‌ها</button>
                 <button onClick={() => setShowPrintModal(true)} disabled={items.length === 0} className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 shadow-lg hover:bg-indigo-700 flex items-center gap-2"><Printer size={18} />تایید نهایی و چاپ نسخه</button>
              </div>
           </div>
        </div>

      {showSaveModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
               <h3 className="font-bold text-lg mb-4">ذخیره به عنوان قالب</h3>
               <input autoFocus className="w-full p-3 border border-gray-300 rounded-xl mb-4" placeholder="نام قالب (مثال: سرماخوردگی)" value={templateName} onChange={e => setTemplateName(e.target.value)} />
               <div className="flex justify-end gap-2"><button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-gray-600">لغو</button><button onClick={handleSaveTemplate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">ذخیره</button></div>
            </div>
         </div>
      )}

      {showPrintModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
               <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Printer />انتخاب نوع چاپ</h3>
               <div className="space-y-3">
                  <button onClick={() => handlePrint('plain')} className="w-full p-4 border border-gray-200 rounded-xl flex items-center justify-between hover:border-indigo-500 hover:bg-indigo-50 transition-all text-right group">
                     <div><span className="font-bold text-gray-700 block group-hover:text-indigo-700">چاپ دیجیتال (استاندارد)</span><span className="text-xs text-gray-500">با سربرگ و لوگوی دیجیتال سیستم</span></div>
                     <CheckCircle size={20} className="text-gray-300 group-hover:text-indigo-500" />
                  </button>
                  <button onClick={() => handlePrint('custom')} disabled={!settings.backgroundImage} className="w-full p-4 border border-gray-200 rounded-xl flex items-center justify-between hover:border-indigo-500 hover:bg-indigo-50 transition-all text-right group disabled:opacity-50 disabled:cursor-not-allowed">
                     <div>
                        <span className="font-bold text-gray-700 block group-hover:text-indigo-700">چاپ روی نسخه اختصاصی</span>
                        <span className="text-xs text-gray-500">جایگذاری متن روی تصویر طراحی شده</span>
                        {!settings.backgroundImage && <span className="text-xs text-red-500 block mt-1"> (ابتدا در تنظیمات طرح را آماده کنید)</span>}
                        {settings.backgroundImage && <span className="text-xs text-blue-500 block mt-1"> (حالت: {settings.printBackground ? 'چاپ پس‌زمینه فعال' : 'چاپ روی کاغذ سربرگ‌دار'})</span>}
                     </div>
                     <CheckCircle size={20} className="text-gray-300 group-hover:text-indigo-500" />
                  </button>
               </div>
               <div className="mt-6 flex justify-end"><button onClick={() => setShowPrintModal(false)} className="text-gray-500 font-bold hover:text-gray-700">انصراف</button></div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Prescription;
