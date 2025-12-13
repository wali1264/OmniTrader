
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientIntake from './pages/PatientIntake';
import Diagnosis from './pages/Diagnosis';
import Laboratory from './pages/Laboratory';
import Radiology from './pages/Radiology';
import PhysicalExam from './pages/PhysicalExam';
import Cardiology from './pages/Cardiology';
import Neurology from './pages/Neurology';
import Psychology from './pages/Psychology';
import Ophthalmology from './pages/Ophthalmology';
import Pediatrics from './pages/Pediatrics';
import Orthopedics from './pages/Orthopedics';
import Dentistry from './pages/Dentistry';
import Gynecology from './pages/Gynecology';
import Pulmonology from './pages/Pulmonology';
import Gastroenterology from './pages/Gastroenterology';
import Urology from './pages/Urology';
import Hematology from './pages/Hematology';
import Emergency from './pages/Emergency';
import Genetics from './pages/Genetics';
import Prescription from './pages/Prescription';
import Settings from './pages/Settings';
import { AppRoute, PatientRecord } from './types';
import { keyManager } from './services/geminiService';

function App() {
  // Default route set to PRESCRIPTION (Mez-e Kar) as per doctor's workflow requirement
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.PRESCRIPTION);
  const [currentRecord, setCurrentRecord] = useState<PatientRecord | null>(null);

  const handleNavigate = (route: AppRoute, record?: PatientRecord) => {
    if (record) {
      setCurrentRecord(record);
    }
    setCurrentRoute(route);
  };

  const handleIntakeSubmit = (record: PatientRecord) => {
    setCurrentRecord(record);
    setCurrentRoute(AppRoute.DIAGNOSIS);
  };

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.DASHBOARD:
        return <Dashboard onNavigate={handleNavigate} />;
      case AppRoute.INTAKE:
        return <PatientIntake onSubmit={handleIntakeSubmit} />;
      case AppRoute.DIAGNOSIS:
        return <Diagnosis patientRecord={currentRecord} onNavigate={handleNavigate} />;
      case AppRoute.PRESCRIPTION:
        return <Prescription initialRecord={currentRecord} />;
      case AppRoute.SETTINGS:
        return <Settings />;
      case AppRoute.LABORATORY:
        return <Laboratory />;
      case AppRoute.RADIOLOGY:
        return <Radiology />;
      case AppRoute.PHYSICAL_EXAM:
        return <PhysicalExam />;
      case AppRoute.CARDIOLOGY:
        return <Cardiology />;
      case AppRoute.NEUROLOGY:
        return <Neurology />;
      case AppRoute.PSYCHOLOGY:
        return <Psychology />;
      case AppRoute.OPHTHALMOLOGY:
        return <Ophthalmology />;
      case AppRoute.PEDIATRICS:
        return <Pediatrics />;
      case AppRoute.ORTHOPEDICS:
        return <Orthopedics />;
      case AppRoute.DENTISTRY:
        return <Dentistry />;
      case AppRoute.GYNECOLOGY:
        return <Gynecology />;
      case AppRoute.PULMONOLOGY:
        return <Pulmonology />;
      case AppRoute.GASTROENTEROLOGY:
        return <Gastroenterology />;
      case AppRoute.UROLOGY:
        return <Urology />;
      case AppRoute.HEMATOLOGY:
        return <Hematology />;
      case AppRoute.EMERGENCY:
        return <Emergency />;
      case AppRoute.GENETICS:
        return <Genetics />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // Check if ANY keys are available via the manager
  if (!keyManager.hasKeys()) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">خطای پیکربندی کلیدها</h1>
          <p className="text-gray-700 leading-relaxed">
            هیچ کلید API یافت نشد. <br/>
            لطفا مطمئن شوید که <code>process.env.API_KEY</code> یا کلیدهایی با پیشوند <code>VITE_GOOGLE_GENAI_TOKEN</code> در متغیرهای محیطی تنظیم شده‌اند.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout currentRoute={currentRoute} onNavigate={(route) => handleNavigate(route)}>
      {renderContent()}
    </Layout>
  );
}

export default App;
