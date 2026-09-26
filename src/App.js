import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Firebase Configuration (Multi-Owner Realtime DB)
const firebaseConfig = {
  apiKey: "AIzaSyDm7SPCrC2JwS65_CVaB2Dn1tgqDc68J-M",
  authDomain: "kirayamanager-pro.firebaseapp.com",
  databaseURL: "https://kirayamanager-pro-default-rtdb.firebaseio.com",
  projectId: "kirayamanager-pro",
  storageBucket: "kirayamanager-pro.firebasestorage.app",
  messagingSenderId: "505648300755",
  appId: "1:505648300755:web:cd29900395ac6bfeb78a26",
  measurementId: "G-3KLS1GSHMV"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ADMIN_UPI = "vs.kumar4@ybl";
const FREE_ROOM_LIMIT = 5;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Persistent Auth Session
  const [authRole, setAuthRole] = useState(() => localStorage.getItem('km_authRole') || 'login_choice');
  const [loggedInTenantRoomId, setLoggedInTenantRoomId] = useState(() => localStorage.getItem('km_tenantRoomId') || null);
  const [activeOwnerId, setActiveOwnerId] = useState(() => localStorage.getItem('km_activeOwnerId') || null);

  // Multi-Owner Auth State (Direct Mobile No - OTP Removed)
  const [isOwnerRegistering, setIsOwnerRegistering] = useState(false);
  const [ownerLoginForm, setOwnerLoginForm] = useState({ id: '', password: '' });
  const [ownerRegisterForm, setOwnerRegisterForm] = useState({ 
    id: '', 
    name: '', 
    phone: '', 
    password: '', 
    confirmPassword: '', 
    upiId: '' 
  });

  const [allOwnersData, setAllOwnersData] = useState({});

  // Subscription Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [subUtr, setSubUtr] = useState('');
  const [subSuccess, setSubSuccess] = useState('');

  // Password Change Modal
  const [showChangeAdminPassModal, setShowChangeAdminPassModal] = useState(false);
  const [changePassForm, setChangePassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [tenantLoginForm, setTenantLoginForm] = useState({ phone: '', pin: '' });
  const [loginMode, setLoginMode] = useState('tenant');

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [propertyFilter, setPropertyFilter] = useState('all');
  
  // Tab-wise individual search state
  const [tabSearches, setTabSearches] = useState({
    dashboard: '',
    properties: '',
    khata: '',
    report: ''
  });

  const currentTabSearch = tabSearches[activeTab] || '';

  const handleSearchChange = (val) => {
    setTabSearches(prev => ({
      ...prev,
      [activeTab]: val
    }));
  };

  const [qrModalRoom, setQrModalRoom] = useState(null);

  // Active Owner Data States
  const [payConfig, setPayConfig] = useState({
    upiId: '9876543210@paytm',
    qrImage: '',
    accHolder: 'Vishvendra Kumar',
    accNo: '',
    ifsc: ''
  });
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Session Storage Sync
  useEffect(() => {
    localStorage.setItem('km_authRole', authRole);
    if (loggedInTenantRoomId) localStorage.setItem('km_tenantRoomId', loggedInTenantRoomId);
    else localStorage.removeItem('km_tenantRoomId');

    if (activeOwnerId) localStorage.setItem('km_activeOwnerId', activeOwnerId);
    else localStorage.removeItem('km_activeOwnerId');
  }, [authRole, loggedInTenantRoomId, activeOwnerId]);

  // Firebase Realtime Listener
  useEffect(() => {
    const ownersRef = ref(db, 'kirayaApp/owners');
    const unsubscribe = onValue(ownersRef, (snapshot) => {
      const val = snapshot.val() || {};
      setAllOwnersData(val);

      if (activeOwnerId && val[activeOwnerId]) {
        const myData = val[activeOwnerId];
        if (myData.payConfig) setPayConfig(myData.payConfig);
        
        const propArr = myData.properties ? (Array.isArray(myData.properties) ? myData.properties : Object.values(myData.properties)) : [];
        setProperties(propArr);

        const roomArr = myData.rooms ? (Array.isArray(myData.rooms) ? myData.rooms : Object.values(myData.rooms)) : [];
        setRooms(roomArr);
      }
    });
    return () => unsubscribe();
  }, [activeOwnerId]);

  // Database Update Helpers
  const updateRoomsInDb = (updatedRooms) => {
    setRooms(updatedRooms);
    if (activeOwnerId) {
      set(ref(db, `kirayaApp/owners/${activeOwnerId}/rooms`), updatedRooms);
    }
  };

  const updatePropsInDb = (updatedProps) => {
    setProperties(updatedProps);
    if (activeOwnerId) {
      set(ref(db, `kirayaApp/owners/${activeOwnerId}/properties`), updatedProps);
    }
  };

  // Modals & Forms
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [editingPropId, setEditingPropId] = useState(null);
  const [propForm, setPropForm] = useState({
    name: '', address: '', pincode: '', locationUrl: '', photo: '', caretakerName: '', caretakerPhone: '', caretakerPhoto: ''
  });

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  
  const [roomForm, setRoomForm] = useState({
    propName: '',
    roomNo: '',
    status: 'occupied',
    tenant: '',
    phone: '',
    dob: '',
    idNumber: '',
    pin: '',
    rent: '',
    security: '',
    depositAmount: '',
    otherCharges: '',
    otherChargesNote: '',
    moveInDate: '2026-09-10',
    initialReading: ''
  });

  const generateAutoPin = (phone, dob) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '';
    let birthYear = '';
    if (dob) {
      const parts = dob.split('-');
      if (parts[0] && parts[0].length === 4) {
        birthYear = parts[0];
      }
    }
    if (last4 && birthYear) {
      return `${last4}${birthYear}`;
    }
    return '';
  };

  const [meterInputs, setMeterInputs] = useState({});
  const [paymentModalRoom, setPaymentModalRoom] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'Cash',
    date: '2026-09-23',
    note: ''
  });

  const [utrForm, setUtrForm] = useState({ amount: '', utrNo: '' });
  
  // Date Range state for Report
  const [reportFilter, setReportFilter] = useState({
    propName: 'all',
    roomId: 'all',
    startDate: '',
    endDate: ''
  });

  // SMART RENT CALCULATION ENGINE
  const calculateChargeableMonths = (room) => {
    if (!room.moveInDate) return 0;
    const moveIn = new Date(room.moveInDate);
    const targetDate = room.vacateDate ? new Date(room.vacateDate) : new Date();

    let completedMonths = (targetDate.getFullYear() - moveIn.getFullYear()) * 12 + (targetDate.getMonth() - moveIn.getMonth());
    if (targetDate.getDate() < moveIn.getDate()) {
      completedMonths -= 1;
    }
    completedMonths = Math.max(0, completedMonths);

    if (room.isVacated || room.status === 'vacant') {
      if (completedMonths === 0) return 1;
      if (targetDate.getDate() > moveIn.getDate()) {
        return completedMonths + 1;
      }
      return completedMonths;
    }

    return completedMonths;
  };

  const getBijliTotal = (r) => (r.electricityHistory || []).reduce((acc, curr) => acc + (Number(curr.bill) || 0), 0);
  const getBijliUnitsTotal = (r) => (r.electricityHistory || []).reduce((acc, curr) => acc + (Number(curr.units) || 0), 0);
  const getPaidTotal = (r) => (r.payments || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const getRentTotalDue = (r) => (Number(r.rent) || 0) * calculateChargeableMonths(r);
  const getOtherChargesTotal = (r) => Number(r.otherCharges) || 0;

  const getRoomTotalDue = (r) => getRentTotalDue(r) + getBijliTotal(r) + getOtherChargesTotal(r);
  const getRoomBakaya = (r) => Math.max(0, getRoomTotalDue(r) - getPaidTotal(r));

  // Date range calculation helpers for Report
  const getFilteredPaymentsForReport = (r) => {
    return (r.payments || []).filter(p => {
      if (!p.date) return true;
      if (reportFilter.startDate && p.date < reportFilter.startDate) return false;
      if (reportFilter.endDate && p.date > reportFilter.endDate) return false;
      return true;
    });
  };

  const getFilteredBijliForReport = (r) => {
    return (r.electricityHistory || []).filter(b => {
      if (!b.date) return true;
      if (reportFilter.startDate && b.date < reportFilter.startDate) return false;
      if (reportFilter.endDate && b.date > reportFilter.endDate) return false;
      return true;
    });
  };

  const triggerUpiPayment = (room) => {
    const bakaya = getRoomBakaya(room);
    if (bakaya <= 0) {
      alert("इस कमरे का कोई बकाया नहीं है!");
      return;
    }
    const upiUri = `upi://pay?pa=${payConfig.upiId}&pn=${encodeURIComponent(payConfig.accHolder)}&am=${bakaya}&cu=INR&tn=Rent_${encodeURIComponent(room.roomNo)}`;
    window.location.assign(upiUri);
  };

  // MULTI-OWNER DIRECT REGISTRATION (OTP REMOVED)
  const handleOwnerRegister = (e) => {
    e.preventDefault();

    const cleanNum = ownerRegisterForm.phone.replace(/\D/g, '');
    if (cleanNum.length !== 10) {
      alert('कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें!');
      return;
    }

    const cleanId = ownerRegisterForm.id.trim().toLowerCase();
    const cleanPass = ownerRegisterForm.password.trim();

    if (cleanPass.length !== 8) {
      alert('पासवर्ड ठीक 8 अक्षरों का होना चाहिए!');
      return;
    }
    if (cleanPass !== ownerRegisterForm.confirmPassword.trim()) {
      alert('पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं!');
      return;
    }
    if (allOwnersData[cleanId]) {
      alert('यह Login ID पहले से मौजूद है! कृपया कोई दूसरी ID चुनें।');
      return;
    }

    const newOwnerProfile = {
      credentials: {
        id: cleanId,
        name: ownerRegisterForm.name,
        phone: cleanNum,
        password: cleanPass
      },
      isPro: false,
      isVerifiedOwner: true,
      payConfig: {
        upiId: ownerRegisterForm.upiId || '9876543210@paytm',
        accHolder: ownerRegisterForm.name || 'Vishvendra Kumar',
        accNo: '',
        ifsc: ''
      },
      properties: [],
      rooms: []
    };

    set(ref(db, `kirayaApp/owners/${cleanId}`), newOwnerProfile);
    setActiveOwnerId(cleanId);
    setAuthRole('owner');
    setIsOwnerRegistering(false);
    alert('आपका मकान मालिक खाता सफलतापूर्वक बन गया है!');
  };

  // Multi-Owner Login
  const handleOwnerLogin = (e) => {
    e.preventDefault();
    const cleanId = ownerLoginForm.id.trim().toLowerCase();
    const cleanPass = ownerLoginForm.password.trim();

    if (cleanPass.length !== 8) {
      alert('पासवर्ड ठीक 8 अक्षरों (characters) का होना चाहिए!');
      return;
    }

    const ownerData = allOwnersData[cleanId];
    if (ownerData && ownerData.credentials && ownerData.credentials.password === cleanPass) {
      setActiveOwnerId(cleanId);
      setAuthRole('owner');
      setOwnerLoginForm({ id: '', password: '' });
    } else {
      alert('गलत Login ID या Password! कृपया सही विवरण दर्ज करें।');
    }
  };

  const handleChangeAdminPassword = (e) => {
    e.preventDefault();
    const curr = changePassForm.currentPassword.trim();
    const newP = changePassForm.newPassword.trim();
    const confP = changePassForm.confirmPassword.trim();

    const currentOwner = allOwnersData[activeOwnerId];
    if (!currentOwner || currentOwner.credentials.password !== curr) {
      alert('वर्तमान पासवर्ड गलत है!');
      return;
    }
    if (newP.length !== 8) {
      alert('नया पासवर्ड ठीक 8 अक्षरों का होना आवश्यक है!');
      return;
    }
    if (newP !== confP) {
      alert('नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं!');
      return;
    }

    set(ref(db, `kirayaApp/owners/${activeOwnerId}/credentials/password`), newP);
    alert('मकान मालिक पासवर्ड सफलतापूर्वक बदल गया है!');
    setChangePassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangeAdminPassModal(false);
  };

  // Multi-Tenant Login
  const handleTenantLogin = (e) => {
    e.preventDefault();
    const phoneInput = tenantLoginForm.phone.trim().replace(/\D/g, '');
    const pinInput = tenantLoginForm.pin.trim().toLowerCase();

    let foundRoom = null;
    let foundOwnerId = null;

    Object.entries(allOwnersData).forEach(([ownerKey, ownerVal]) => {
      const roomList = ownerVal.rooms ? (Array.isArray(ownerVal.rooms) ? ownerVal.rooms : Object.values(ownerVal.rooms)) : [];
      const match = roomList.find(r => {
        if (r.status === 'vacant') return false;
        const cleanPhone = (r.phone || '').replace(/\D/g, '');
        const autoPin = generateAutoPin(r.phone, r.dob).toLowerCase();
        const customPin = (r.pin || '').toLowerCase();
        
        const phoneMatches = cleanPhone === phoneInput;
        const pinMatches = pinInput === autoPin || pinInput === customPin || (r.roomNo && r.roomNo.toLowerCase().includes(pinInput));
        return phoneMatches && pinMatches;
      });

      if (match) {
        foundRoom = match;
        foundOwnerId = ownerKey;
      }
    });

    if (foundRoom) {
      setActiveOwnerId(foundOwnerId);
      setLoggedInTenantRoomId(foundRoom.id);
      setAuthRole('tenant');
      setTenantLoginForm({ phone: '', pin: '' });
    } else {
      alert('गलत मोबाइल नंबर या पासवर्ड! पासवर्ड: मोबाइल अंतिम 4 अंक + जन्म वर्ष (उदा. 32101998)');
    }
  };

  const handleLogout = () => {
    setAuthRole('login_choice');
    setLoggedInTenantRoomId(null);
    setActiveOwnerId(null);
    setSelectedRoomId(null);
    localStorage.removeItem('km_authRole');
    localStorage.removeItem('km_tenantRoomId');
    localStorage.removeItem('km_activeOwnerId');
  };

  const handleTenantAutoDepositUTR = (room) => {
    const amount = Number(utrForm.amount);
    const utr = utrForm.utrNo.trim();

    if (!amount || amount <= 0) {
      alert('कृपया सही जमा राशि भरें।');
      return;
    }
    if (utr.length < 8) {
      alert('कृपया 12-अंकों का UPI UTR / Ref No. भरें।');
      return;
    }

    const newPayment = {
      id: Date.now(),
      amount,
      mode: 'UPI (Auto-Tenant)',
      date: new Date().toISOString().split('T')[0],
      note: `UTR: ${utr}`
    };

    const updated = rooms.map(r => r.id === room.id ? { ...r, payments: [newPayment, ...(r.payments || [])] } : r);
    updateRoomsInDb(updated);
    alert(`सफलतापूर्वक जमा! ₹${amount} खाते में दर्ज कर दिए गए हैं (UTR: ${utr})।`);
    setUtrForm({ amount: '', utrNo: '' });
  };

  const sendWhatsAppBusinessReminder = (room) => {
    const bakaya = getRoomBakaya(room);
    const cleanPhone = (room.phone || '').replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const propInfo = properties.find(p => p.name === room.propName);
    const propHeader = propInfo 
      ? `🏢 *${propInfo.name}*\n📍 *पता:* ${propInfo.address} (पिन: ${propInfo.pincode})\n`
      : `🏢 *${room.propName}*\n`;

    const upiLink = `upi://pay?pa=${payConfig.upiId}&pn=${encodeURIComponent(payConfig.accHolder)}&am=${bakaya}&cu=INR&tn=Rent_${encodeURIComponent(room.roomNo)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiLink)}`;

    const msg = `*किराया भुगतान रिमाइंडर (Kiraya Manager)*\n` +
      `${propHeader}` +
      `----------------------------------------\n` +
      `नमस्ते *${room.tenant}* जी,\n` +
      `आपके *${room.roomNo}* का हिसाब:\n\n` +
      `💰 *कुल बकाया: ₹${bakaya.toLocaleString()}*\n` +
      `🛡️ एडवांस डिपॉजिट: ₹${room.depositAmount || 0} | सिक्योरिटी: ₹${room.security || 0}\n\n` +
      `📲 *QR स्कैन करके पेमेंट करें:*\n` +
      `${qrImageUrl}\n\n` +
      `👉 *सीधे पेमेंट लिंक:*\n` +
      `${upiLink}\n\n` +
      `🏦 *बैंक खाता:*\n` +
      `• धारक: ${payConfig.accHolder}\n` +
      `• A/C: ${payConfig.accNo}\n` +
      `• IFSC: ${payConfig.ifsc}\n` +
      `• UPI: ${payConfig.upiId}\n` +
      `----------------------------------------\n` +
      `भुगतान के बाद UTR नंबर दर्ज करें। धन्यवाद!`;

    const encodedText = encodeURIComponent(msg);
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `intent://send?phone=${phoneWithCode}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end;`;
    } else {
      window.open(`https://wa.me/${phoneWithCode}?text=${encodedText}`, '_blank');
    }
  };

  const handleShareReport = async () => {
    const sTerm = (tabSearches.report || '').toLowerCase();
    const filtered = rooms
      .filter(r => reportFilter.propName === 'all' || r.propName === reportFilter.propName)
      .filter(r => reportFilter.roomId === 'all' || r.id === reportFilter.roomId)
      .filter(r => !sTerm || r.roomNo.toLowerCase().includes(sTerm) || (r.tenant && r.tenant.toLowerCase().includes(sTerm)));

    let summaryText = `*Kiraya Manager Statement Report*\n`;
    summaryText += `प्रॉपर्टी: ${reportFilter.propName === 'all' ? 'सभी प्रॉपर्टीज' : reportFilter.propName}\n`;
    summaryText += `दिनांक: ${new Date().toLocaleDateString('hi-IN')}\n`;
    if (reportFilter.startDate || reportFilter.endDate) {
      summaryText += `अवधि: ${reportFilter.startDate || 'प्रारंभ'} से ${reportFilter.endDate || 'आज'}\n`;
    }
    summaryText += `\n`;

    filtered.forEach(r => {
      const pList = getFilteredPaymentsForReport(r);
      const bList = getFilteredBijliForReport(r);
      const bTotal = bList.reduce((acc, curr) => acc + (Number(curr.bill) || 0), 0);
      const pTotal = pList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      summaryText += `------------------------------------\n`;
      summaryText += `🚪 *${r.roomNo}* (${r.status === 'occupied' ? (r.tenant || 'किरायेदार') : 'खाली'})\n`;
      summaryText += `• किराया: ₹${getRentTotalDue(r)} | बिजली बिल: ₹${bTotal}\n`;
      summaryText += `• कुल जमा: ₹${pTotal} | *बकाया: ₹${getRoomBakaya(r)}*\n`;
      
      if (pList.length > 0) {
        summaryText += `   👉 जमा भुगतान विवरण:\n`;
        pList.forEach(p => {
          summaryText += `     - ₹${p.amount} (${p.mode}) दिनांक: ${p.date} ${p.note ? `[${p.note}]` : ''}\n`;
        });
      } else {
        summaryText += `   👉 कोई भुगतान जमा नहीं हुआ है।\n`;
      }
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kiraya Manager Report',
          text: summaryText
        });
      } catch (err) {
        window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, '_blank');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(summaryText)}`, '_blank');
    }
  };

  const openEditRoomModal = (room) => {
    setEditingRoomId(room.id);
    const currentDob = room.dob || '';
    const currentPhone = room.phone || '';
    const computedPin = room.pin || generateAutoPin(currentPhone, currentDob) || '1234';

    setRoomForm({
      propName: room.propName || (properties[0]?.name || ''),
      roomNo: room.roomNo || '',
      status: room.status || 'occupied',
      tenant: room.tenant || '',
      phone: currentPhone,
      dob: currentDob,
      idNumber: room.idNumber || '',
      pin: computedPin,
      rent: String(room.rent || ''),
      security: String(room.security || ''),
      depositAmount: String(room.depositAmount || ''),
      otherCharges: String(room.otherCharges || ''),
      otherChargesNote: room.otherChargesNote || '',
      moveInDate: room.moveInDate || new Date().toISOString().split('T')[0],
      initialReading: String(room.initialReading || '')
    });
    setShowAddRoom(true);
  };

  const openNewTenantOccupiedModal = (room) => {
    setEditingRoomId(room.id);
    setRoomForm({
      propName: room.propName || (properties[0]?.name || ''),
      roomNo: room.roomNo || '',
      status: 'occupied',
      tenant: '',
      phone: '',
      dob: '',
      idNumber: '',
      pin: '',
      rent: String(room.rent || ''),
      security: '',
      depositAmount: '',
      otherCharges: '',
      otherChargesNote: '',
      moveInDate: new Date().toISOString().split('T')[0],
      initialReading: String(room.currentReading || room.initialReading || '')
    });
    setShowAddRoom(true);
  };

  const handleSaveRoom = (e) => {
    e.preventDefault();

    // 5 Rooms Free Limit Check
    const currentOwner = allOwnersData[activeOwnerId] || {};
    const isPro = currentOwner.isPro || false;
    if (!editingRoomId && !isPro && rooms.length >= FREE_ROOM_LIMIT) {
      setShowAddRoom(false);
      setShowPayModal(true);
      return;
    }

    const finalPin = roomForm.pin || generateAutoPin(roomForm.phone, roomForm.dob) || '1234';

    let updated;
    if (editingRoomId) {
      const existingRoom = rooms.find(r => r.id === editingRoomId);
      const isSwitchingToNewTenant = existingRoom && existingRoom.status === 'vacant' && roomForm.status === 'occupied';

      updated = rooms.map(r => r.id === editingRoomId ? {
        ...r,
        propName: roomForm.propName,
        roomNo: roomForm.roomNo,
        status: roomForm.status,
        tenant: roomForm.status === 'vacant' ? '' : roomForm.tenant,
        phone: roomForm.status === 'vacant' ? '' : roomForm.phone,
        dob: roomForm.status === 'vacant' ? '' : roomForm.dob,
        idNumber: roomForm.status === 'vacant' ? '' : roomForm.idNumber,
        pin: finalPin,
        rent: Number(roomForm.rent) || 0,
        security: Number(roomForm.security) || 0,
        depositAmount: Number(roomForm.depositAmount) || 0,
        otherCharges: Number(roomForm.otherCharges) || 0,
        otherChargesNote: roomForm.otherChargesNote,
        moveInDate: roomForm.moveInDate,
        initialReading: Number(roomForm.initialReading) || 0,
        currentReading: Number(roomForm.initialReading) || 0,
        isVacated: roomForm.status === 'vacant',
        vacateDate: roomForm.status === 'vacant' ? (r.vacateDate || new Date().toISOString().split('T')[0]) : null,
        payments: isSwitchingToNewTenant ? [] : (r.payments || []),
        electricityHistory: isSwitchingToNewTenant ? [] : (r.electricityHistory || [])
      } : r);
      alert(isSwitchingToNewTenant ? 'नया किरायेदार सफलतापूर्वक दर्ज हो गया!' : 'कमरा व किरायेदार विवरण सफलतापूर्वक अपडेट हो गया!');
    } else {
      const newR = {
        id: String(Date.now()),
        roomNo: roomForm.roomNo.startsWith('Room') ? roomForm.roomNo : `Room ${roomForm.roomNo}`,
        propName: roomForm.propName || (properties[0]?.name || 'Building 1'),
        tenant: roomForm.status === 'occupied' ? roomForm.tenant : '',
        phone: roomForm.status === 'occupied' ? roomForm.phone : '',
        dob: roomForm.status === 'occupied' ? roomForm.dob : '',
        idNumber: roomForm.status === 'occupied' ? roomForm.idNumber : '',
        pin: finalPin,
        rent: Number(roomForm.rent) || 0,
        security: Number(roomForm.security) || 0,
        depositAmount: Number(roomForm.depositAmount) || 0,
        otherCharges: Number(roomForm.otherCharges) || 0,
        otherChargesNote: roomForm.otherChargesNote,
        status: roomForm.status,
        moveInDate: roomForm.moveInDate,
        initialReading: Number(roomForm.initialReading) || 0,
        currentReading: Number(roomForm.initialReading) || 0,
        isVacated: roomForm.status === 'vacant',
        vacateDate: roomForm.status === 'vacant' ? new Date().toISOString().split('T')[0] : null,
        electricityHistory: [],
        payments: [],
        tenantHistory: []
      };
      updated = [newR, ...rooms];
      alert('नया कमरा सुरक्षित हो गया!');
    }
    updateRoomsInDb(updated);
    setShowAddRoom(false);
    setEditingRoomId(null);
  };

  const handleToggleRoomVacate = (room) => {
    if (room.status === 'occupied') {
      const chargeable = calculateChargeableMonths({ ...room, isVacated: true, vacateDate: new Date().toISOString().split('T')[0] });
      const rentDue = chargeable * Number(room.rent);
      const totalDue = rentDue + getBijliTotal(room) + getOtherChargesTotal(room);
      const grossBakaya = Math.max(0, totalDue - getPaidTotal(room));
      const deposit = Number(room.security || 0) + Number(room.depositAmount || 0);

      let msg = `कमरा खाली करने का हिसाब:\n\n• किरायेदार: ${room.tenant}\n• चार्जेबल माह: ${chargeable} Month\n• कुल देय बकाया: ₹${grossBakaya}\n• जमा सिक्योरिटी/डिपॉजिट: ₹${deposit}\n\n`;
      if (deposit >= grossBakaya) {
        msg += `👉 किरायेदार को रिफंड करने योग्य राशि: ₹${deposit - grossBakaya}`;
      } else {
        msg += `👉 किरायेदार से वसूलने योग्य शेष राशि: ₹${grossBakaya - deposit}`;
      }
      msg += `\n\nक्या आप वाकई कमरा खाली (Vacant) करना चाहते हैं? (किरायेदार का पूरा डेटा इतिहास में सुरक्षित रहेगा)`;

      if (window.confirm(msg)) {
        const vacateToday = new Date().toISOString().split('T')[0];
        
        const archivedTenantRecord = {
          id: Date.now(),
          tenant: room.tenant,
          phone: room.phone,
          dob: room.dob || '',
          idNumber: room.idNumber || '',
          moveInDate: room.moveInDate,
          vacateDate: vacateToday,
          rent: room.rent,
          security: room.security || 0,
          depositAmount: room.depositAmount || 0,
          finalBakaya: grossBakaya,
          totalPaid: getPaidTotal(room),
          payments: room.payments || [],
          electricityHistory: room.electricityHistory || []
        };

        const updated = rooms.map(r => r.id === room.id ? {
          ...r,
          status: 'vacant',
          isVacated: true,
          vacateDate: vacateToday,
          tenant: '',
          phone: '',
          dob: '',
          idNumber: '',
          pin: '',
          depositAmount: 0,
          security: 0,
          payments: [],
          electricityHistory: [],
          tenantHistory: [archivedTenantRecord, ...(r.tenantHistory || [])]
        } : r);

        updateRoomsInDb(updated);
        alert(`कमरा ${room.roomNo} खाली मार्क हो गया है और ${room.tenant} का संपूर्ण डेटा इतिहास में सुरक्षित कर दिया गया है!`);
      }
    } else {
      if (window.confirm('क्या आप इस कमरे में नया किरायेदार जोड़ना (Occupied करना) चाहते हैं?')) {
        openNewTenantOccupiedModal(room);
      }
    }
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('कृपया सही राशि दर्ज करें।');
      return;
    }

    const currentRoom = rooms.find(r => r.id === paymentModalRoom.id);
    if (!currentRoom) return;

    let updatedPayments = [...(currentRoom.payments || [])];

    if (editingPaymentId) {
      updatedPayments = updatedPayments.map(p => p.id === editingPaymentId ? {
        ...p,
        amount: Number(paymentForm.amount),
        mode: paymentForm.mode,
        date: paymentForm.date,
        note: paymentForm.note
      } : p);
      alert('पेमेंट सफलतापूर्वक अपडेट हो गई!');
    } else {
      const newP = {
        id: Date.now(),
        amount: Number(paymentForm.amount),
        mode: paymentForm.mode,
        date: paymentForm.date,
        note: paymentForm.note
      };
      updatedPayments = [newP, ...updatedPayments];
      alert('पेमेंट दर्ज हो गई!');
    }

    const updatedRooms = rooms.map(r => r.id === currentRoom.id ? { ...r, payments: updatedPayments } : r);
    updateRoomsInDb(updatedRooms);

    setPaymentModalRoom(null);
    setEditingPaymentId(null);
    setPaymentForm({ amount: '', mode: 'Cash', date: '2026-09-23', note: '' });
  };

  const openEditPayment = (p, room) => {
    setPaymentModalRoom(room);
    setEditingPaymentId(p.id);
    setPaymentForm({
      amount: String(p.amount),
      mode: p.mode || 'Cash',
      date: p.date || '2026-09-23',
      note: p.note || ''
    });
  };

  const handleDeletePayment = (paymentId, room) => {
    if (!window.confirm('क्या आप इस भुगतान एंट्री को हटाना चाहते हैं?')) return;
    const updatedPayments = (room.payments || []).filter(p => p.id !== paymentId);
    const updatedRooms = rooms.map(r => r.id === room.id ? { ...r, payments: updatedPayments } : r);
    updateRoomsInDb(updatedRooms);
  };

  const handleSaveBijli = (room) => {
    const input = meterInputs[room.id] || {};
    const curr = Number(input.curr);
    const rate = Number(input.rate || 10);
    const prev = Number(room.currentReading || room.initialReading || 0);

    if (!curr || curr < prev) {
      alert(`वर्तमान रीडिंग पिछली रीडिंग (${prev}) से अधिक होनी चाहिए।`);
      return;
    }

    const units = curr - prev;
    const bill = units * rate;
    const newEntry = {
      id: Date.now(),
      date: input.date || '2026-09-23',
      prev,
      curr,
      units,
      rate,
      bill,
      meterPhoto: input.meterPhoto || ''
    };

    const updated = rooms.map(r => r.id === room.id ? {
      ...r,
      currentReading: curr,
      electricityHistory: [newEntry, ...(r.electricityHistory || [])]
    } : r);

    updateRoomsInDb(updated);
    setMeterInputs(prevMap => ({ ...prevMap, [room.id]: { curr: '', rate: '10', date: '2026-09-23', meterPhoto: '' } }));
    alert(`रीडिंग सुरक्षित हुई! ${units} यूनिट का ₹${bill} जुड़ गया।`);
  };

  const handleMeterPhotoUpload = (roomId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMeterInputs(prev => ({
        ...prev,
        [roomId]: { ...(prev[roomId] || {}), meterPhoto: reader.result }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleTenantReadingSubmit = (room) => {
    const input = meterInputs[room.id] || {};
    const curr = Number(input.curr);
    const prev = Number(room.currentReading || room.initialReading || 0);

    if (!curr || curr < prev) {
      alert(`वर्तमान रीडिंग पिछली रीडिंग (${prev}) से अधिक होनी चाहिए।`);
      return;
    }
    const defaultRate = 10;
    const units = curr - prev;
    const bill = units * defaultRate;

    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      prev,
      curr,
      units,
      rate: defaultRate,
      bill,
      meterPhoto: input.meterPhoto || '',
      submittedByTenant: true
    };

    const updated = rooms.map(r => r.id === room.id ? {
      ...r,
      currentReading: curr,
      electricityHistory: [newEntry, ...(r.electricityHistory || [])]
    } : r);

    updateRoomsInDb(updated);
    setMeterInputs(prevMap => ({ ...prevMap, [room.id]: { curr: '', meterPhoto: '' } }));
    alert(`रीडिंग सबमिट हो गई! ${units} यूनिट का ₹${bill} बिल में जुड़ गया।`);
  };

  // Submit UTR for Subscription
  const submitSubscriptionUtr = () => {
    if (!subUtr || subUtr.trim().length < 8) {
      alert('कृपया सही 12-अंक UPI Ref/UTR नंबर दर्ज करें।');
      return;
    }
    const reqRef = ref(db, `kirayaApp/subscription_requests/${activeOwnerId}_${Date.now()}`);
    set(reqRef, {
      ownerId: activeOwnerId,
      ownerName: allOwnersData[activeOwnerId]?.credentials?.name || '',
      plan: selectedPlan,
      utr: subUtr.trim(),
      amount: selectedPlan === 'monthly' ? 199 : 1499,
      date: new Date().toISOString()
    }).then(() => {
      set(ref(db, `kirayaApp/owners/${activeOwnerId}/isPro`), true);
      setSubSuccess('पेमेंट विवरण प्राप्त हुआ! आपका Pro Unlimited Plan सक्रिय कर दिया गया है।');
      setTimeout(() => {
        setShowPayModal(false);
        setSubSuccess('');
        setSubUtr('');
      }, 2500);
    });
  };

  const currentOwnerProfile = allOwnersData[activeOwnerId] || {};
  const isOwnerPro = currentOwnerProfile.isPro || false;

  const planAmount = selectedPlan === 'monthly' ? 199 : 1499;
  const ownerUpiUri = `upi://pay?pa=${ADMIN_UPI}&pn=KirayaManagerPro&am=${planAmount}&cu=INR&tn=ProUpgrade_${activeOwnerId}`;
  const ownerQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(ownerUpiUri)}`;

  const occupiedList = rooms.filter(r => r.status === 'occupied');
  const totalBakayaAll = rooms.reduce((acc, r) => acc + getRoomBakaya(r), 0);
  const totalJamaAll = rooms.reduce((acc, r) => acc + getPaidTotal(r), 0);
  const totalAdvanceAll = occupiedList.reduce((acc, r) => acc + (Number(r.security || 0) + Number(r.depositAmount || 0)), 0);

  // 1. GATEWAY SCREEN
  if (authRole === 'login_choice') {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.1)', border: '1px solid #e0f2fe' }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 12px auto' }}>🏠</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: '#0284c7' }}>Kiraya Manager</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Good morning! Login to continue</p>
          </div>

          <div style={{ display: 'flex', backgroundColor: '#f0f9ff', padding: '5px', borderRadius: '30px', marginBottom: '20px', border: '1px solid #bae6fd' }}>
            <button
              onClick={() => { setLoginMode('tenant'); setIsOwnerRegistering(false); }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '25px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: loginMode === 'tenant' ? '#0284c7' : 'transparent', color: loginMode === 'tenant' ? '#fff' : '#0369a1', transition: 'all 0.2s ease' }}
            >
              👤 किरायेदार
            </button>
            <button
              onClick={() => setLoginMode('owner')}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '25px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: loginMode === 'owner' ? '#0284c7' : 'transparent', color: loginMode === 'owner' ? '#fff' : '#0369a1', transition: 'all 0.2s ease' }}
            >
              🔑 मकान मालिक (Owner)
            </button>
          </div>

          {loginMode === 'tenant' ? (
            <form onSubmit={handleTenantLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>रजिस्टर्ड मोबाइल नंबर *</label>
                <input
                  type="tel"
                  placeholder="10 अंकों का मोबाइल नंबर"
                  value={tenantLoginForm.phone}
                  onChange={e => setTenantLoginForm({ ...tenantLoginForm, phone: e.target.value })}
                  style={{ width: '92%', padding: '12px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  किरायेदार पासवर्ड *
                </label>
                <input
                  type="password"
                  placeholder="मोबाइल अंतिम 4 अंक + जन्म वर्ष (उदा. 32101998)"
                  value={tenantLoginForm.pin}
                  onChange={e => setTenantLoginForm({ ...tenantLoginForm, pin: e.target.value })}
                  style={{ width: '92%', padding: '12px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none' }}
                  required
                />
                <span style={{ fontSize: '11px', color: '#0284c7', marginTop: '4px', display: 'block' }}>
                  💡 हिंट: मोबाइल के अंतिम 4 अंक + जन्म वर्ष (YYYY)
                </span>
              </div>
              <button type="submit" style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '14px', borderRadius: '30px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}>
                पोर्टल खोलें →
              </button>
            </form>
          ) : (
            isOwnerRegistering ? (
              <form onSubmit={handleOwnerRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <strong style={{ fontSize: '15px', color: '#0284c7' }}>नया मकान मालिक खाता बनाएं (Direct Registration)</strong>
                
                <input
                  type="text"
                  placeholder="Login ID (उदा. vishvendra12) *"
                  value={ownerRegisterForm.id}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, id: e.target.value })}
                  style={{ width: '92%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none' }}
                  required
                />
                <input
                  type="text"
                  placeholder="आपका पूरा नाम *"
                  value={ownerRegisterForm.name}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, name: e.target.value })}
                  style={{ width: '92%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none' }}
                  required
                />

                {/* Direct Mobile Number (No OTP Required) */}
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="मोबाइल नंबर (10 अंक) *"
                  value={ownerRegisterForm.phone}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, phone: e.target.value })}
                  style={{ width: '92%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none' }}
                  required
                />

                <input
                  type="text"
                  placeholder="UPI ID (किराया प्राप्त करने हेतु) *"
                  value={ownerRegisterForm.upiId}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, upiId: e.target.value })}
                  style={{ width: '92%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none' }}
                  required
                />
                <input
                  type="password"
                  maxLength={8}
                  placeholder="8-अक्षर का पासवर्ड *"
                  value={ownerRegisterForm.password}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, password: e.target.value })}
                  style={{ width: '92%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none', fontWeight: '700' }}
                  required
                />
                <input
                  type="password"
                  maxLength={8}
                  placeholder="कन्फर्म पासवर्ड *"
                  value={ownerRegisterForm.confirmPassword}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, confirmPassword: e.target.value })}
                  style={{ width: '92%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none', fontWeight: '700' }}
                  required
                />

                <button 
                  type="submit" 
                  style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '14px', borderRadius: '30px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
                >
                  खाता बनाएं व डैशबोर्ड खोलें 🚀
                </button>
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <span onClick={() => setIsOwnerRegistering(false)} style={{ fontSize: '12px', color: '#0284c7', cursor: 'pointer', fontWeight: '700' }}>
                    पहले से खाता है? लॉगिन करें
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOwnerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>Owner Login ID *</label>
                  <input
                    type="text"
                    placeholder="Login ID दर्ज करें"
                    value={ownerLoginForm.id}
                    onChange={e => setOwnerLoginForm({ ...ownerLoginForm, id: e.target.value })}
                    style={{ width: '92%', padding: '12px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none', fontWeight: '700' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>8-अक्षर पासवर्ड *</label>
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="8 अक्षर पासवर्ड"
                    value={ownerLoginForm.password}
                    onChange={e => setOwnerLoginForm({ ...ownerLoginForm, password: e.target.value })}
                    style={{ width: '92%', padding: '12px 14px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', outline: 'none', fontWeight: '800', letterSpacing: '2px' }}
                    required
                  />
                </div>
                <button type="submit" style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '14px', borderRadius: '30px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}>
                  Admin डैशबोर्ड खोलें 🔓
                </button>
                
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <span onClick={() => { setIsOwnerRegistering(true); }} style={{ fontSize: '12px', color: '#0284c7', cursor: 'pointer', fontWeight: '800' }}>
                    + नया मकान मालिक अकाउंट बनाएं (Register Here)
                  </span>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    );
  }

  // 2. VIEW: KIRAYEDAAR PORTAL
  if (authRole === 'tenant') {
    const tenantRoom = rooms.find(r => r.id === loggedInTenantRoomId);
    if (!tenantRoom || tenantRoom.status === 'vacant') {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
          <p style={{ color: '#64748b' }}>खाता सक्रिय नहीं मिला या कमरा खाली हो चुका है।</p>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: '700' }}>लॉगिन स्क्रीन पर जाएं</button>
        </div>
      );
    }

    const bakaya = getRoomBakaya(tenantRoom);
    const chargeableMonths = calculateChargeableMonths(tenantRoom);
    const tInput = meterInputs[tenantRoom.id] || { curr: '', meterPhoto: '' };
    const dynamicUpiUri = `upi://pay?pa=${payConfig.upiId}&pn=${encodeURIComponent(payConfig.accHolder)}&am=${bakaya}&cu=INR&tn=Rent_${encodeURIComponent(tenantRoom.roomNo)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dynamicUpiUri)}`;

    const tenantLast4 = (tenantRoom.phone || '').replace(/\D/g, '').slice(-4) || 'XXXX';
    const tenantYear = (tenantRoom.dob || '').split('-')[0] || 'YYYY';

    return (
      <div style={{ maxWidth: '450px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', paddingBottom: '30px', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
        <header style={{ backgroundColor: '#fff', padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7' }}>{tenantRoom.tenant}</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Good morning! · {tenantRoom.roomNo}</div>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            Logout
          </button>
        </header>

        <div style={{ padding: '20px' }}>
          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '20px', padding: '14px 16px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔐</span>
              <strong style={{ fontSize: '13px', color: '#0369a1' }}>पासवर्ड हिंट:</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '6px' }}>
              मोबाइल अंतिम 4 अंक [<strong>{tenantLast4}</strong>] + जन्म वर्ष [<strong>{tenantYear}</strong>]
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>कुल बकाया राशि (Total Due)</div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: bakaya > 0 ? '#0284c7' : '#10b981', margin: '6px 0' }}>
              ₹{bakaya.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
              मासिक किराया: ₹{tenantRoom.rent} | कुल देय: {chargeableMonths} माह
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>एडवांस</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7' }}>₹{tenantRoom.depositAmount || 0}</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>सिक्योरिटी</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7' }}>₹{tenantRoom.security || 0}</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', textAlign: 'center', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <strong style={{ fontSize: '15px', display: 'block', color: '#0f172a', marginBottom: '12px' }}>
              ⚡ ऑटो-अमाउंट UPI QR कोड
            </strong>
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              style={{ width: '180px', height: '180px', margin: '0 auto 14px auto', display: 'block', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '8px' }}
            />
            <a
              href={dynamicUpiUri}
              style={{ display: 'block', width: '90%', margin: '0 auto', backgroundColor: '#0284c7', color: '#fff', textDecoration: 'none', padding: '14px 10px', borderRadius: '30px', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
            >
              📲 Pay ₹{bakaya} via UPI
            </a>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '24px', padding: '20px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '10px' }}>
              ✓ पेमेंट के बाद UTR दर्ज करें:
            </strong>
            <input
              type="number"
              placeholder="जमा राशि (₹)"
              value={utrForm.amount}
              onChange={e => setUtrForm({ ...utrForm, amount: e.target.value })}
              style={{ width: '92%', padding: '10px 14px', fontSize: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '10px', outline: 'none' }}
            />
            <input
              type="text"
              placeholder="12-अंकों का UPI UTR"
              value={utrForm.utrNo}
              onChange={e => setUtrForm({ ...utrForm, utrNo: e.target.value })}
              style={{ width: '92%', padding: '10px 14px', fontSize: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '12px', outline: 'none' }}
            />
            <button
              type="button"
              onClick={() => handleTenantAutoDepositUTR(tenantRoom)}
              style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              UTR वेरीफाई करें
            </button>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>📸 बिजली मीटर रीडिंग</strong>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>पिछली रीडिंग: <strong>{tenantRoom.currentReading || tenantRoom.initialReading}</strong></div>
            <input
              type="number"
              placeholder="वर्तमान मीटर रीडिंग"
              value={tInput.curr}
              onChange={e => setMeterInputs({ ...meterInputs, [tenantRoom.id]: { ...tInput, curr: e.target.value } })}
              style={{ width: '92%', padding: '10px 14px', fontSize: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '10px', outline: 'none' }}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => handleMeterPhotoUpload(tenantRoom.id, e.target.files[0])}
              style={{ marginBottom: '12px', fontSize: '12px' }}
            />
            {tInput.meterPhoto && <img src={tInput.meterPhoto} alt="Preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px' }} />}
            <button onClick={() => handleTenantReadingSubmit(tenantRoom)} style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              रीडिंग सबमिट करें
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. VIEW: OWNER DASHBOARD
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div style={{ maxWidth: '450px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', paddingBottom: '90px', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      {/* TOP HEADER MATCHING PHOTO */}
      <header className="no-print" style={{ backgroundColor: '#fff', padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px', color: '#0284c7', cursor: 'pointer' }}>☰</span>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7', lineHeight: '1.2' }}>{payConfig.accHolder || 'Vishvendra Kumar'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Good morning! {isOwnerPro ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>⭐ PRO</span> : <span>({rooms.length}/{FREE_ROOM_LIMIT} Free)</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {!isOwnerPro && (
              <button onClick={() => setShowPayModal(true)} style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                ⚡ Pro
              </button>
            )}
            <button onClick={() => setShowChangeAdminPassModal(true)} style={{ backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              🔑 Pass
            </button>
            <button onClick={handleLogout} style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>

        {/* TAB-INDEPENDENT SEARCH BAR */}
        <div style={{ marginTop: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1.5px solid #0284c7', borderRadius: '30px', padding: '8px 16px', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)' }}>
            <span style={{ color: '#0284c7', marginRight: '8px', fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder={`Search ${activeTab === 'dashboard' ? 'rooms/properties' : activeTab === 'report' ? 'in report' : activeTab}...`}
              value={currentTabSearch}
              onChange={e => handleSearchChange(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a', fontWeight: '500' }}
            />
            {currentTabSearch && (
              <span onClick={() => handleSearchChange('')} style={{ color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', paddingLeft: '8px' }}>✕</span>
            )}
          </div>
        </div>
      </header>

      {/* INDIVIDUAL ROOM DEDICATED DASHBOARD */}
      {selectedRoom ? (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <button onClick={() => setSelectedRoomId(null)} style={{ background: '#fff', color: '#0284c7', border: '1px solid #bae6fd', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              ← सभी कमरे
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => openEditRoomModal(selectedRoom)} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                ✏️ एडिट
              </button>
              <button onClick={() => handleToggleRoomVacate(selectedRoom)} style={{ background: selectedRoom.status === 'occupied' ? '#fff7ed' : '#f0fdf4', color: selectedRoom.status === 'occupied' ? '#c2410c' : '#15803d', border: '1px solid', borderColor: selectedRoom.status === 'occupied' ? '#fed7aa' : '#bbf7d0', padding: '8px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                {selectedRoom.status === 'occupied' ? '🚪 खाली करें' : '🔑 Occupied (नया)'}
              </button>
            </div>
          </div>
          
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  {selectedRoom.roomNo} · {selectedRoom.status === 'occupied' ? (selectedRoom.tenant || 'किरायेदार') : <span style={{ color: '#ea580c' }}>खाली कमरा (Vacant)</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>📞 {selectedRoom.phone || 'नंबर नहीं है'} · {selectedRoom.propName}</div>
                {selectedRoom.dob && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>🎂 जन्म तिथि: {selectedRoom.dob}</div>}
                {selectedRoom.idNumber && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>🆔 पहचान सं.: {selectedRoom.idNumber}</div>}
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  📅 प्रवेश तारीख: <strong>{selectedRoom.moveInDate || '-'}</strong> | अवधि: <strong>{calculateChargeableMonths(selectedRoom)} माह</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>कुल बकाया</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: getRoomBakaya(selectedRoom) > 0 ? '#0284c7' : '#10b981' }}>₹{getRoomBakaya(selectedRoom).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', color: '#0284c7', fontWeight: '700' }}>
              <span>मासिक किराया: ₹{selectedRoom.rent}</span>
              <span>डिपॉजिट: ₹{selectedRoom.depositAmount || 0} | सिक्योरिटी: ₹{selectedRoom.security || 0}</span>
            </div>

            {selectedRoom.status === 'occupied' && selectedRoom.phone && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button onClick={() => sendWhatsAppBusinessReminder(selectedRoom)} style={{ flex: 1, backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  🟢 WhatsApp
                </button>
                <button onClick={() => setQrModalRoom(selectedRoom)} style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  QR Code
                </button>
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '18px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '10px', color: '#0f172a' }}>📋 मद-वार विवरण (Breakdown):</strong>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>कमरा किराया ({calculateChargeableMonths(selectedRoom)} माह):</span>
                <strong>₹{getRentTotalDue(selectedRoom)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>बिजली बिल ({getBijliUnitsTotal(selectedRoom)} Unit):</span>
                <strong>₹{getBijliTotal(selectedRoom)}</strong>
              </div>
              {Number(selectedRoom.otherCharges) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>अन्य शुल्क ({selectedRoom.otherChargesNote || 'विविध'}):</span>
                  <strong>₹{selectedRoom.otherCharges}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <span>कुल जमा राशि (Paid):</span>
                <strong>- ₹{getPaidTotal(selectedRoom)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: '800', fontSize: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                <span>कुल बाकी बकाया:</span>
                <span>₹{getRoomBakaya(selectedRoom)}</span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>📜 जमा भुगतान इतिहास</strong>
              {selectedRoom.status === 'occupied' && (
                <button onClick={() => { setPaymentModalRoom(selectedRoom); setEditingPaymentId(null); setPaymentForm({ amount: String(getRoomBakaya(selectedRoom) || ''), mode: 'Cash', date: '2026-09-23', note: '' }); }} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                  + नया जमा
                </button>
              )}
            </div>

            {(selectedRoom.payments || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>कोई भुगतान रिकॉर्ड नहीं है।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedRoom.payments || []).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#0284c7', fontSize: '14px' }}>
                        ₹{p.amount} <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'normal' }}>({p.mode})</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        📅 {p.date} {p.note && `• ${p.note}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEditPayment(p, selectedRoom)} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => handleDeletePayment(p.id, selectedRoom)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '10px', color: '#0f172a' }}>⚡ मीटर रीडिंग इतिहास</strong>
            {(selectedRoom.electricityHistory || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>कोई मीटर रीडिंग एंट्री नहीं है।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedRoom.electricityHistory || []).map(b => (
                  <div key={b.id} style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>खपत: {b.units} Unit</span>
                      <strong style={{ color: '#0284c7', fontSize: '14px' }}>₹{b.bill}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      रीडिंग: {b.prev} से {b.curr} (@ ₹{b.rate}/Unit) | 📅 {b.date}
                    </div>
                    {b.meterPhoto && (
                      <img src={b.meterPhoto} alt="Meter" style={{ width: '100%', maxHeight: '110px', objectFit: 'cover', borderRadius: '12px', marginTop: '8px' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedRoom.status === 'occupied' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>⚡ नई बिजली मीटर रीडिंग डालें</strong>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                पिछली रीडिंग: <strong>{selectedRoom.currentReading || selectedRoom.initialReading}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="number"
                  placeholder="वर्तमान रीडिंग"
                  value={(meterInputs[selectedRoom.id] || {}).curr || ''}
                  onChange={e => setMeterInputs({ ...meterInputs, [selectedRoom.id]: { ...(meterInputs[selectedRoom.id] || {}), curr: e.target.value } })}
                  style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px', outline: 'none' }}
                />
                <input
                  type="number"
                  placeholder="दर (₹10)"
                  value={(meterInputs[selectedRoom.id] || {}).rate || '10'}
                  onChange={e => setMeterInputs({ ...meterInputs, [selectedRoom.id]: { ...(meterInputs[selectedRoom.id] || {}), rate: e.target.value } })}
                  style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px', outline: 'none' }}
                />
              </div>
              <button onClick={() => handleSaveBijli(selectedRoom)} style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontWeight: '700', cursor: 'pointer' }}>
                रीडिंग सुरक्षित करें
              </button>
            </div>
          )}

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '12px', color: '#0284c7' }}>
              📜 पूर्व किरायेदारों का इतिहास
            </strong>
            {(!selectedRoom.tenantHistory || selectedRoom.tenantHistory.length === 0) ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                इस कमरे में अभी तक कोई पूर्व किरायेदार का रिकॉर्ड नहीं है।
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedRoom.tenantHistory.map((th, idx) => (
                  <div key={th.id || idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>👤 {th.tenant}</strong>
                      <span style={{ fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>
                        खाली: {th.vacateDate}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                      📞 {th.phone || 'नंबर नहीं'} | 📅 {th.moveInDate} से {th.vacateDate}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '11px' }}>
                      <span>किराया दर: ₹{th.rent}</span>
                      <span>कुल जमा: <strong style={{ color: '#10b981' }}>₹{th.totalPaid}</strong></span>
                      <span>अंतिम बकाया: <strong style={{ color: '#0284c7' }}>₹{th.finalBakaya}</strong></span>
                      <span>सिक्योरिटी: ₹{th.security}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>कमरे (भरे/खाली)</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{occupiedList.length} / {rooms.length - occupiedList.length}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>कुल एडवांस</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>₹{totalAdvanceAll.toLocaleString()}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>कुल जमा</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>₹{totalJamaAll.toLocaleString()}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>कुल बाकी</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>₹{totalBakayaAll.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' }}>कमरे (Properties)</h3>
                <button onClick={() => { 
                  if (!isOwnerPro && rooms.length >= FREE_ROOM_LIMIT) {
                    setShowPayModal(true);
                    return;
                  }
                  setEditingRoomId(null); 
                  setRoomForm({ propName: properties[0]?.name || '', roomNo: '', status: 'occupied', tenant: '', phone: '', dob: '', idNumber: '', pin: '', rent: '', security: '', depositAmount: '', otherCharges: '', otherChargesNote: '', moveInDate: '2026-09-10', initialReading: '' }); 
                  setShowAddRoom(true); 
                }} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '25px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' }}>
                  + नया कमरा
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {rooms
                  .filter(r => propertyFilter === 'all' || r.propName === propertyFilter)
                  .filter(r => {
                    const s = (tabSearches.dashboard || '').toLowerCase();
                    if (!s) return true;
                    return r.roomNo.toLowerCase().includes(s) || (r.tenant && r.tenant.toLowerCase().includes(s)) || (r.phone && r.phone.includes(s)) || r.propName.toLowerCase().includes(s);
                  })
                  .map(room => (
                    <div key={room.id} style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 6px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                      <div onClick={() => setSelectedRoomId(room.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ height: '110px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <span style={{ fontSize: '42px' }}>🛋️</span>
                          <span style={{ position: 'absolute', top: '12px', right: '14px', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', color: room.status === 'occupied' ? '#0284c7' : '#ea580c' }}>
                            {room.status === 'occupied' ? 'Occupied' : 'Vacant'}
                          </span>
                        </div>

                        <div style={{ padding: '16px 18px 12px 18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div>
                              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{room.roomNo} ({room.status === 'occupied' ? (room.tenant || 'किरायेदार') : 'खाली'})</div>
                              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{room.propName}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7' }}>₹{room.rent}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>/month</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <span>• {room.status === 'occupied' ? 'Occupied' : 'खाली कमरा'}</span>
                            <span>• बकाया: <strong style={{ color: getRoomBakaya(room) > 0 ? '#0284c7' : '#10b981' }}>₹{getRoomBakaya(room)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', padding: '0 18px 16px 18px' }}>
                        <button onClick={() => openEditRoomModal(room)} style={{ flex: 1, backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          ✏️ विवरण एडिट
                        </button>
                        <button onClick={() => handleToggleRoomVacate(room)} style={{ flex: 1, backgroundColor: room.status === 'occupied' ? '#fff7ed' : '#f0fdf4', color: room.status === 'occupied' ? '#c2410c' : '#15803d', border: '1px solid', borderColor: room.status === 'occupied' ? '#fed7aa' : '#bbf7d0', padding: '8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          {room.status === 'occupied' ? '🚪 खाली करें' : '🔑 Occupied (नया)'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'properties' && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>मेरी प्रॉपर्टीज ({properties.length})</h2>
                <button onClick={() => { setEditingPropId(null); setPropForm({ name: '', address: '', pincode: '', locationUrl: '', photo: '', caretakerName: '', caretakerPhone: '', caretakerPhoto: '' }); setShowAddProperty(true); }} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '25px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' }}>
                  + नई प्रॉपर्टी
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {properties
                  .filter(p => {
                    const s = (tabSearches.properties || '').toLowerCase();
                    if (!s) return true;
                    return p.name.toLowerCase().includes(s) || p.address.toLowerCase().includes(s) || (p.caretakerName && p.caretakerName.toLowerCase().includes(s));
                  })
                  .map(p => {
                    const propRooms = rooms.filter(r => r.propName === p.name);
                    return (
                      <div key={p.id} style={{ backgroundColor: '#fff', borderRadius: '24px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <img src={p.photo || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&q=60'} alt={p.name} style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
                        <div style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{p.name}</strong>
                            <button onClick={() => { setEditingPropId(p.id); setPropForm({ ...p }); setShowAddProperty(true); }} style={{ backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>✏️ Edit</button>
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', margin: '4px 0' }}>📍 {p.address} ({p.pincode})</div>
                          <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>👤 देखरेख: {p.caretakerName} ({p.caretakerPhone})</div>

                          <button
                            onClick={() => {
                              setPropertyFilter(p.name);
                              setActiveTab('dashboard');
                            }}
                            style={{ width: '100%', marginTop: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)' }}
                          >
                            🚪 इस प्रॉपर्टी के कमरे देखें ({propRooms.length})
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'khata' && (
            <div style={{ padding: '16px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📖 खाता बही (Ledger)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rooms
                  .filter(r => {
                    const s = (tabSearches.khata || '').toLowerCase();
                    if (!s) return true;
                    return r.roomNo.toLowerCase().includes(s) || (r.tenant && r.tenant.toLowerCase().includes(s)) || (r.phone && r.phone.includes(s));
                  })
                  .map(room => {
                    const rent = getRentTotalDue(room);
                    const bijli = getBijliTotal(room);
                    const paid = getPaidTotal(room);
                    const bakaya = getRoomBakaya(room);

                    return (
                      <div key={room.id} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{room.roomNo}</strong> ({room.status === 'occupied' ? (room.tenant || 'किरायेदार') : 'खाली'})
                            <div style={{ fontSize: '12px', color: '#64748b' }}>🏢 {room.propName}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>बकाया:</span>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: bakaya > 0 ? '#0284c7' : '#10b981' }}>₹{bakaya.toLocaleString()}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#64748b', margin: '10px 0', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                          किराया बिल: <strong>₹{rent}</strong> | बिजली: <strong>₹{bijli}</strong> | जमा: <strong style={{ color: '#10b981' }}>₹{paid}</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setSelectedRoomId(room.id)} style={{ flex: 1, backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            विवरण देखें
                          </button>
                          {room.status === 'occupied' && (
                            <button onClick={() => { setPaymentModalRoom(room); setEditingPaymentId(null); setPaymentForm({ amount: String(bakaya || ''), mode: 'Cash', date: '2026-09-23', note: '' }); }} style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                              + जमा दर्ज करें
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED REPORT WITH 1-ROOM / ALL ROOMS FILTER, DATE RANGE & DOWNLOAD */}
          {activeTab === 'report' && (
            <div style={{ padding: '16px' }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📊 विस्तृत रिपोर्ट
                </h2>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={handleShareReport} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    WhatsApp
                  </button>
                  <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    Print
                  </button>
                  <button onClick={() => window.print()} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    📥 Download
                  </button>
                </div>
              </div>

              {/* REPORT ROOM & DATE RANGE FILTER CONTROLS */}
              <div className="no-print" style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>प्रॉपर्टी चुनें:</label>
                    <select value={reportFilter.propName} onChange={e => setReportFilter({ ...reportFilter, propName: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '4px', fontWeight: '700', outline: 'none' }}>
                      <option value="all">सभी प्रॉपर्टीज</option>
                      {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>कमरा चुनें (1 कमरा या सभी):</label>
                    <select value={reportFilter.roomId} onChange={e => setReportFilter({ ...reportFilter, roomId: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '4px', fontWeight: '700', outline: 'none' }}>
                      <option value="all">सभी कमरे (All Rooms)</option>
                      {rooms
                        .filter(r => reportFilter.propName === 'all' || r.propName === reportFilter.propName)
                        .map(r => <option key={r.id} value={r.id}>{r.roomNo} ({r.tenant || 'खाली'})</option>)
                      }
                    </select>
                  </div>
                </div>

                {/* DATE RANGE FILTER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>दिनांक से (Start Date):</label>
                    <input 
                      type="date" 
                      value={reportFilter.startDate} 
                      onChange={e => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                      style={{ width: '92%', padding: '7px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>दिनांक तक (End Date):</label>
                    <input 
                      type="date" 
                      value={reportFilter.endDate} 
                      onChange={e => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                      style={{ width: '92%', padding: '7px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '12px', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* REPORT STATEMENT TABLE */}
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 6px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0284c7', backgroundColor: '#f0f9ff' }}>
                        <th style={{ padding: '10px 6px', fontWeight: '800', color: '#0f172a' }}>कमरा</th>
                        <th style={{ padding: '10px 6px', fontWeight: '800', color: '#0f172a' }}>किरायेदार</th>
                        <th style={{ padding: '10px 6px', fontWeight: '800', color: '#0f172a' }}>किराया</th>
                        <th style={{ padding: '10px 6px', fontWeight: '800', color: '#0f172a' }}>बिजली बिल</th>
                        <th style={{ padding: '10px 6px', fontWeight: '800', color: '#0f172a' }}>जमा विवरण</th>
                        <th style={{ padding: '10px 6px', fontWeight: '800', color: '#0284c7' }}>बकाया</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms
                        .filter(r => reportFilter.propName === 'all' || r.propName === reportFilter.propName)
                        .filter(r => reportFilter.roomId === 'all' || r.id === reportFilter.roomId)
                        .filter(r => {
                          const s = (tabSearches.report || '').toLowerCase();
                          if (!s) return true;
                          return r.roomNo.toLowerCase().includes(s) || (r.tenant && r.tenant.toLowerCase().includes(s)) || (r.phone && r.phone.includes(s));
                        })
                        .map(r => {
                          const pList = getFilteredPaymentsForReport(r);
                          const bList = getFilteredBijliForReport(r);
                          const bTotal = bList.reduce((acc, curr) => acc + (Number(curr.bill) || 0), 0);
                          const pTotal = pList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                              <td style={{ padding: '10px 6px', fontWeight: '800', color: '#0f172a' }}>{r.roomNo}</td>
                              <td style={{ padding: '10px 6px', color: '#475569' }}>{r.status === 'occupied' ? (r.tenant || 'किरायेदार') : 'खाली'}</td>
                              <td style={{ padding: '10px 6px', fontWeight: '600' }}>₹{getRentTotalDue(r)}</td>
                              <td style={{ padding: '10px 6px', color: '#64748b' }}>₹{bTotal}</td>
                              <td style={{ padding: '10px 6px', color: '#10b981', fontWeight: '600' }}>₹{pTotal}</td>
                              <td style={{ padding: '10px 6px', color: '#0284c7', fontWeight: '800' }}>₹{getRoomBakaya(r)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      {showChangeAdminPassModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>🔑 पासवर्ड बदलें</h3>
            <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="password" placeholder="पुराना पासवर्ड" value={changePassForm.currentPassword} onChange={e => setChangePassForm({ ...changePassForm, currentPassword: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input type="password" maxLength={8} placeholder="नया 8-अक्षर पासवर्ड" value={changePassForm.newPassword} onChange={e => setChangePassForm({ ...changePassForm, newPassword: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input type="password" maxLength={8} placeholder="कन्फर्म नया पासवर्ड" value={changePassForm.confirmPassword} onChange={e => setChangePassForm({ ...changePassForm, confirmPassword: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px', borderRadius: '20px', fontWeight: '700' }}>अपडेट करें</button>
                <button type="button" onClick={() => setShowChangeAdminPassModal(false)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '10px', borderRadius: '20px', fontWeight: '700' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '370px', borderRadius: '24px', padding: '22px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              {editingRoomId ? (roomForm.status === 'occupied' && !roomForm.tenant ? '🔑 नए किरायेदार की जानकारी' : '✏️ कमरा विवरण सुधारें') : '+ नया कमरा जोड़ें'}
            </h3>
            <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select value={roomForm.propName} onChange={e => setRoomForm({ ...roomForm, propName: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input placeholder="कमरा नंबर (101) *" value={roomForm.roomNo} onChange={e => setRoomForm({ ...roomForm, roomNo: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
                <select value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                  <option value="occupied">Occupied</option>
                  <option value="vacant">Khali (खाली)</option>
                </select>
              </div>

              {roomForm.status === 'occupied' && (
                <>
                  <input placeholder="किरायेदार का नाम *" value={roomForm.tenant} onChange={e => setRoomForm({ ...roomForm, tenant: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
                  <input placeholder="मोबाइल नंबर (10 अंक) *" value={roomForm.phone} onChange={e => { const np = e.target.value; setRoomForm({ ...roomForm, phone: np, pin: generateAutoPin(np, roomForm.dob) || roomForm.pin }); }} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
                  <input type="date" value={roomForm.dob} onChange={e => { const nd = e.target.value; setRoomForm({ ...roomForm, dob: nd, pin: generateAutoPin(roomForm.phone, nd) || roomForm.pin }); }} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
                  <input placeholder="पहचान पत्र संख्या" value={roomForm.idNumber} onChange={e => setRoomForm({ ...roomForm, idNumber: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
                </>
              )}

              <input type="number" placeholder="मासिक किराया (₹) *" value={roomForm.rent} onChange={e => setRoomForm({ ...roomForm, rent: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input type="number" placeholder="सिक्योरिटी (₹)" value={roomForm.security} onChange={e => setRoomForm({ ...roomForm, security: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
                <input type="number" placeholder="एडवांस (₹)" value={roomForm.depositAmount} onChange={e => setRoomForm({ ...roomForm, depositAmount: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
              </div>
              <input type="date" value={roomForm.moveInDate} onChange={e => setRoomForm({ ...roomForm, moveInDate: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input type="number" placeholder="शुरुआती मीटर रीडिंग *" value={roomForm.initialReading} onChange={e => setRoomForm({ ...roomForm, initialReading: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontWeight: '700' }}>सुरक्षित करें</button>
                <button type="button" onClick={() => setShowAddRoom(false)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '12px', borderRadius: '30px', fontWeight: '700' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddProperty && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '370px', borderRadius: '24px', padding: '22px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>+ नई प्रॉपर्टी जोड़ें</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              let updated;
              if (editingPropId) {
                updated = properties.map(p => p.id === editingPropId ? { ...propForm, id: editingPropId } : p);
              } else {
                updated = [...properties, { id: Date.now(), ...propForm }];
              }
              updatePropsInDb(updated);
              setShowAddProperty(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="प्रॉपर्टी नाम (श्याम भवन) *" value={propForm.name} onChange={e => setPropForm({ ...propForm, name: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input placeholder="पूरा पता *" value={propForm.address} onChange={e => setPropForm({ ...propForm, address: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input placeholder="पिन कोड *" value={propForm.pincode} onChange={e => setPropForm({ ...propForm, pincode: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input placeholder="गूगल मैप लोकेशन लिंक" value={propForm.locationUrl} onChange={e => setPropForm({ ...propForm, locationUrl: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
              <input placeholder="फोटो URL" value={propForm.photo} onChange={e => setPropForm({ ...propForm, photo: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
              <input placeholder="केयरटेकर नाम *" value={propForm.caretakerName} onChange={e => setPropForm({ ...propForm, caretakerName: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <input placeholder="केयरटेकर फोन *" value={propForm.caretakerPhone} onChange={e => setPropForm({ ...propForm, caretakerPhone: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontWeight: '700' }}>सुरक्षित करें</button>
                <button type="button" onClick={() => setShowAddProperty(false)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '12px', borderRadius: '30px', fontWeight: '700' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentModalRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800' }}>💰 किराया जमा — {paymentModalRoom.roomNo}</h3>
            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="number" placeholder="राशि (₹) *" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} style={{ padding: '10px', border: '2px solid #0284c7', borderRadius: '12px', fontSize: '16px', fontWeight: '800' }} required />
              <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} required />
              <select value={paymentForm.mode} onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Transfer</option>
              </select>
              <input placeholder="विवरण (उदा. सितंबर किराया)" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontWeight: '700' }}>सेव करें</button>
                <button type="button" onClick={() => setPaymentModalRoom(null)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '12px', borderRadius: '30px', fontWeight: '700' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrModalRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '16px', fontWeight: '800' }}>{qrModalRoom.roomNo} का ऑटो QR</strong>
              <span onClick={() => setQrModalRoom(null)} style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>✕</span>
            </div>
            
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`upi://pay?pa=${payConfig.upiId}&pn=${encodeURIComponent(payConfig.accHolder)}&am=${getRoomBakaya(qrModalRoom)}&cu=INR&tn=Rent_${encodeURIComponent(qrModalRoom.roomNo)}`)}`}
              alt="Payment QR"
              style={{ width: '200px', height: '200px', margin: '0 auto 12px', display: 'block', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '8px' }}
            />

            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0284c7', marginBottom: '4px' }}>
              ₹{getRoomBakaya(qrModalRoom).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', marginBottom: '14px' }}>
              UPI ID: {payConfig.upiId}
            </div>

            <button
              onClick={() => triggerUpiPayment(qrModalRoom)}
              style={{ width: '100%', backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '12px', borderRadius: '30px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}
            >
              📲 Pay Now खोलें
            </button>
            <button
              onClick={() => setQrModalRoom(null)}
              style={{ width: '100%', border: '1px solid #cbd5e1', background: '#fff', padding: '10px', borderRadius: '30px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              बंद करें
            </button>
          </div>
        </div>
      )}

      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 99999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '24px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowPayModal(false)} style={{ position: 'absolute', top: '14px', right: '16px', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>

            <span style={{ fontSize: '36px' }}>👑</span>
            <h3 style={{ margin: '6px 0 4px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Kiraya Manager Pro Upgrade</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
              आपकी 5-कमरों की Free सीमा पूरी हो चुकी है। असीमित कमरों के लिए प्लान चुनें:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div
                onClick={() => setSelectedPlan('monthly')}
                style={{ border: selectedPlan === 'monthly' ? '2px solid #0284c7' : '1px solid #cbd5e1', padding: '12px 6px', borderRadius: '16px', cursor: 'pointer', backgroundColor: selectedPlan === 'monthly' ? '#f0f9ff' : '#fff' }}
              >
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>Pro Monthly</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#0284c7', margin: '4px 0' }}>₹199 / माह</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>अनलिमिटेड कमरे</div>
              </div>

              <div
                onClick={() => setSelectedPlan('annual')}
                style={{ border: selectedPlan === 'annual' ? '2px solid #0284c7' : '1px solid #cbd5e1', padding: '12px 6px', borderRadius: '16px', cursor: 'pointer', backgroundColor: selectedPlan === 'annual' ? '#f0f9ff' : '#fff', position: 'relative' }}
              >
                <span style={{ position: 'absolute', top: '-7px', right: '6px', backgroundColor: '#ef4444', color: '#fff', fontSize: '8px', padding: '2px 6px', borderRadius: '8px', fontWeight: '800' }}>SAVE 35%</span>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>Pro Annual</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#0284c7', margin: '4px 0' }}>₹1,499 / वर्ष</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>पूरे साल की बचत</div>
              </div>
            </div>

            <a
              href={ownerUpiUri}
              style={{ display: 'block', backgroundColor: '#0284c7', color: '#fff', textDecoration: 'none', padding: '12px', borderRadius: '30px', fontWeight: '800', fontSize: '13px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
            >
              📲 Pay ₹{planAmount} via PhonePe / GPay
            </a>

            <img
              src={ownerQrUrl}
              alt="Admin UPI QR"
              style={{ width: '150px', height: '150px', margin: '0 auto 8px auto', display: 'block', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '6px' }}
            />

            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
              UPI ID: <b>{ADMIN_UPI}</b>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>12-अंक UPI Ref / UTR दर्ज करें:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="उदा: 426812345678"
                  value={subUtr}
                  onChange={e => setSubUtr(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                />
                <button
                  onClick={submitSubscriptionUtr}
                  style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  Activate
                </button>
              </div>
            </div>

            {subSuccess && (
              <div style={{ marginTop: '10px', backgroundColor: '#ecfdf5', color: '#065f46', padding: '8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                {subSuccess}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 ORIGINAL BUTTONS FLOATING BOTTOM NAVIGATION */}
      <nav className="no-print" style={{ position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '420px', height: '62px', backgroundColor: '#fff', borderRadius: '35px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000, boxShadow: '0 8px 30px rgba(2, 132, 199, 0.12)', border: '1px solid #e0f2fe', padding: '0 10px' }}>
        {[
          { id: 'dashboard', label: 'डैशबोर्ड', icon: '田' },
          { id: 'properties', label: 'प्रॉपर्टी', icon: '🏢' },
          { id: 'khata', label: 'खाता बही', icon: '📖' },
          { id: 'report', label: 'रिपोर्ट', icon: '📄' }
        ].map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setSelectedRoomId(null); setActiveTab(item.id); }}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActive ? '#0284c7' : '#64748b',
                cursor: 'pointer',
                flex: 1,
                padding: '4px 0'
              }}
            >
              <span style={{ fontSize: '18px', color: isActive ? '#0284c7' : '#64748b' }}>{item.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: isActive ? '800' : '600', marginTop: '2px' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* PRINT STYLES & FONTS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @media print {
          body { background-color: #fff !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
