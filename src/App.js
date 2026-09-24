import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Aapka Naya Firebase Realtime Database URL
const firebaseConfig = {
  databaseURL: "https://kirayamanager-pro-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ADMIN_UPI = "vs.kumar4@ybl";
const FREE_ROOM_LIMIT = 5;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Persistent Auth Session via LocalStorage
  const [authRole, setAuthRole] = useState(() => localStorage.getItem('km_authRole') || 'login_choice');
  const [loggedInTenantRoomId, setLoggedInTenantRoomId] = useState(() => localStorage.getItem('km_tenantRoomId') || null);
  const [activeOwnerId, setActiveOwnerId] = useState(() => localStorage.getItem('km_activeOwnerId') || null);

  // Multi-Owner Auth State
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
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' | 'annual'
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
  const [loginMode, setLoginMode] = useState('tenant'); // 'tenant' ya 'owner'

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [qrModalRoom, setQrModalRoom] = useState(null);

  // Active Owner Data States
  const [payConfig, setPayConfig] = useState({
    upiId: '9876543210@paytm',
    qrImage: '',
    accHolder: 'Property Manager',
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

  const getPaidUnitsStatus = (r) => {
    const totalUnits = getBijliUnitsTotal(r);
    const totalBijliBill = getBijliTotal(r);
    const totalPaid = getPaidTotal(r);
    const totalRent = getRentTotalDue(r);

    if (totalBijliBill <= 0) return '0 / 0 Unit Paid';

    const amountAvailableForBijli = Math.max(0, totalPaid - totalRent);
    if (amountAvailableForBijli >= totalBijliBill) {
      return `पूरा चुकता (${totalUnits} Unit Paid)`;
    } else if (amountAvailableForBijli > 0) {
      const avgRate = totalBijliBill / (totalUnits || 1);
      const unitsPaidEstimate = Math.floor(amountAvailableForBijli / (avgRate || 10));
      return `${unitsPaidEstimate} / ${totalUnits} Unit चुकता`;
    } else {
      return `0 / ${totalUnits} Unit चुकता (बकाया)`;
    }
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

  // MULTI-OWNER REGISTRATION & LOGIN
  const handleOwnerRegister = (e) => {
    e.preventDefault();
    const cleanId = ownerRegisterForm.id.trim().toLowerCase();
    const cleanPass = ownerRegisterForm.password.trim();

    if (cleanPass.length !== 8) {
      alert('पासवर्ड ठीक 8 अक्षरों (characters) का होना चाहिए!');
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
        phone: ownerRegisterForm.phone,
        password: cleanPass
      },
      isPro: false,
      payConfig: {
        upiId: ownerRegisterForm.upiId || '9876543210@paytm',
        accHolder: ownerRegisterForm.name || 'Property Manager',
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
      alert('नया पासवर्ड ठीक 8 अक्षरों (characters) का होना आवश्यक है!');
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

  // MULTI-TENANT LOGIN
  const handleTenantLogin = (e) => {
    e.preventDefault();
    const phoneInput = tenantLoginForm.phone.trim().replace(/\D/g, '');
    const pinInput = tenantLoginForm.pin.trim().toLowerCase();

    let foundRoom = null;
    let foundOwnerId = null;

    Object.entries(allOwnersData).forEach(([ownerKey, ownerVal]) => {
      const roomList = ownerVal.rooms ? (Array.isArray(ownerVal.rooms) ? ownerVal.rooms : Object.values(ownerVal.rooms)) : [];
      const match = roomList.find(r => {
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
    const filtered = rooms
      .filter(r => reportFilter.propName === 'all' || r.propName === reportFilter.propName)
      .filter(r => reportFilter.roomId === 'all' || r.id === reportFilter.roomId);

    let summaryText = `*Kiraya Manager Statement Report*\n`;
    summaryText += `प्रॉपर्टी: ${reportFilter.propName === 'all' ? 'सभी प्रॉपर्टीज' : reportFilter.propName}\n`;
    summaryText += `दिनांक: ${new Date().toLocaleDateString('hi-IN')}\n\n`;

    filtered.forEach(r => {
      summaryText += `------------------------------------\n`;
      summaryText += `🚪 *${r.roomNo}* (${r.tenant || 'खाली'})\n`;
      summaryText += `• किराया: ₹${getRentTotalDue(r)} | बिजली बिल: ₹${getBijliTotal(r)}\n`;
      summaryText += `• कुल जमा: ₹${getPaidTotal(r)} | *बकाया: ₹${getRoomBakaya(r)}*\n`;
      
      const paymentsList = r.payments || [];
      if (paymentsList.length > 0) {
        summaryText += `  👉 जमा भुगतान विवरण:\n`;
        paymentsList.forEach(p => {
          summaryText += `    - ₹${p.amount} (${p.mode}) दिनांक: ${p.date} ${p.note ? `[${p.note}]` : ''}\n`;
        });
      } else {
        summaryText += `  👉 कोई भुगतान जमा नहीं हुआ है।\n`;
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
      moveInDate: room.moveInDate || '2026-09-10',
      initialReading: String(room.initialReading || '')
    });
    setShowAddRoom(true);
  };

  const handleSaveRoom = (e) => {
    e.preventDefault();

    // FREE LIMIT CHECK (5 Rooms)
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
        initialReading: Number(roomForm.initialReading) || 0
      } : r);
      alert('कमरा व किरायेदार विवरण सफलतापूर्वक अपडेट हो गया!');
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
        payments: []
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

      let msg = `कमरा खाली करने का हिसाब:\n\n• चार्जेबल माह: ${chargeable} Month\n• कुल देय बकाया: ₹${grossBakaya}\n• जमा सिक्योरिटी/डिपॉजिट: ₹${deposit}\n\n`;
      if (deposit >= grossBakaya) {
        msg += `👉 किरायेदार को रिफंड करने योग्य राशि: ₹${deposit - grossBakaya}`;
      } else {
        msg += `👉 किरायेदार से वसूलने योग्य शेष राशि: ₹${grossBakaya - deposit}`;
      }
      msg += `\n\nक्या आप वाकई कमरा खाली (Vacant) मार्क करना चाहते हैं?`;

      if (window.confirm(msg)) {
        const updated = rooms.map(r => r.id === room.id ? {
          ...r,
          status: 'vacant',
          isVacated: true,
          vacateDate: new Date().toISOString().split('T')[0]
        } : r);
        updateRoomsInDb(updated);
        alert('कमरा खाली मार्क हो गया है!');
      }
    } else {
      if (window.confirm('क्या आप इस कमरे को पुनः Occupied (किराये पर) मार्क करना चाहते हैं?')) {
        openEditRoomModal(room);
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
      <div style={{ maxWidth: '440px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#059669', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 10px auto' }}>🏠</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>Kiraya Manager</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>मल्टी-यूज़र पोर्टल में आपका स्वागत है</p>
          </div>

          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => { setLoginMode('tenant'); setIsOwnerRegistering(false); }}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', backgroundColor: loginMode === 'tenant' ? '#fff' : 'transparent', color: loginMode === 'tenant' ? '#059669' : '#64748b', boxShadow: loginMode === 'tenant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              👤 किरायेदार
            </button>
            <button
              onClick={() => setLoginMode('owner')}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', backgroundColor: loginMode === 'owner' ? '#fff' : 'transparent', color: loginMode === 'owner' ? '#059669' : '#64748b', boxShadow: loginMode === 'owner' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              🔑 मकान मालिक (Owner)
            </button>
          </div>

          {loginMode === 'tenant' ? (
            <form onSubmit={handleTenantLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>रजिस्टर्ड मोबाइल नंबर *</label>
                <input
                  type="tel"
                  placeholder="10 अंकों का मोबाइल नंबर"
                  value={tenantLoginForm.phone}
                  onChange={e => setTenantLoginForm({ ...tenantLoginForm, phone: e.target.value })}
                  style={{ width: '92%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  किरायेदार पासवर्ड *
                </label>
                <input
                  type="password"
                  placeholder="मोबाइल अंतिम 4 अंक + जन्म वर्ष (उदा. 32101998)"
                  value={tenantLoginForm.pin}
                  onChange={e => setTenantLoginForm({ ...tenantLoginForm, pin: e.target.value })}
                  style={{ width: '92%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                  required
                />
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  💡 पासवर्ड हिंट: आपके मोबाइल के अंतिम 4 अंक + जन्म वर्ष (YYYY)
                </span>
              </div>
              <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', marginTop: '6px' }}>
                पोर्टल खोलें →
              </button>
            </form>
          ) : (
            isOwnerRegistering ? (
              <form onSubmit={handleOwnerRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>नया मकान मालिक खाता बनाएं (New Sign Up)</strong>
                
                <input
                  type="text"
                  placeholder="मनपसंद Login ID (उदा. vishvendra12) *"
                  value={ownerRegisterForm.id}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, id: e.target.value })}
                  style={{ width: '92%', padding: '9px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  required
                />
                <input
                  type="text"
                  placeholder="आपका पूरा नाम *"
                  value={ownerRegisterForm.name}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, name: e.target.value })}
                  style={{ width: '92%', padding: '9px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  required
                />
                <input
                  type="tel"
                  placeholder="मोबाइल नंबर *"
                  value={ownerRegisterForm.phone}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, phone: e.target.value })}
                  style={{ width: '92%', padding: '9px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  required
                />
                <input
                  type="text"
                  placeholder="UPI ID (किराया प्राप्त करने हेतु) *"
                  value={ownerRegisterForm.upiId}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, upiId: e.target.value })}
                  style={{ width: '92%', padding: '9px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  required
                />
                <input
                  type="password"
                  maxLength={8}
                  placeholder="8-अक्षर का पासवर्ड *"
                  value={ownerRegisterForm.password}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, password: e.target.value })}
                  style={{ width: '92%', padding: '9px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '800' }}
                  required
                />
                <input
                  type="password"
                  maxLength={8}
                  placeholder="कन्फर्म पासवर्ड *"
                  value={ownerRegisterForm.confirmPassword}
                  onChange={e => setOwnerRegisterForm({ ...ownerRegisterForm, confirmPassword: e.target.value })}
                  style={{ width: '92%', padding: '9px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '800' }}
                  required
                />

                <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
                  रजिस्टर करें व डैशबोर्ड खोलें
                </button>
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <span onClick={() => setIsOwnerRegistering(false)} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: '700' }}>
                    पहले से खाता है? लॉगिन करें
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOwnerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Owner Login ID *</label>
                  <input
                    type="text"
                    placeholder="Login ID दर्ज करें"
                    value={ownerLoginForm.id}
                    onChange={e => setOwnerLoginForm({ ...ownerLoginForm, id: e.target.value })}
                    style={{ width: '92%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>8-अक्षर पासवर्ड *</label>
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="8 अक्षर पासवर्ड"
                    value={ownerLoginForm.password}
                    onChange={e => setOwnerLoginForm({ ...ownerLoginForm, password: e.target.value })}
                    style={{ width: '92%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '800', letterSpacing: '2px' }}
                    required
                  />
                </div>
                <button type="submit" style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', marginTop: '4px' }}>
                  Admin डैशबोर्ड खोलें 🔓
                </button>
                
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <span onClick={() => setIsOwnerRegistering(true)} style={{ fontSize: '12px', color: '#059669', cursor: 'pointer', fontWeight: '800' }}>
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
    if (!tenantRoom) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>खाता नहीं मिला।</p>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px' }}>लॉगिन स्क्रीन पर जाएं</button>
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
      <div style={{ maxWidth: '450px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', paddingBottom: '30px' }}>
        <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800' }}>👤 {tenantRoom.tenant}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>{tenantRoom.roomNo} · {tenantRoom.propName}</div>
          </div>
          <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            Logout
          </button>
        </header>

        <div style={{ padding: '16px' }}>
          {/* PASSWORD HINT CARD */}
          <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #bfdbfe', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🔐</span>
              <strong style={{ fontSize: '13px', color: '#1e40af' }}>आपका लॉगिन पासवर्ड हिंट (Password Hint):</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '6px', lineHeight: '1.4' }}>
              आपका पासवर्ड इन दो चीज़ों से मिलकर बना है:
              <div style={{ marginTop: '4px', padding: '6px 10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px dashed #93c5fd', fontWeight: 'bold' }}>
                👉 [मोबाइल के अंतिम 4 अंक: <span style={{ color: '#2563eb' }}>{tenantLast4}</span>] + [जन्म वर्ष: <span style={{ color: '#059669' }}>{tenantYear}</span>]
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '18px', border: '2px solid #e2e8f0', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '700' }}>कुल बकाया राशि (Total Due)</div>
            <div style={{ fontSize: '38px', fontWeight: '900', color: bakaya > 0 ? '#dc2626' : '#059669', margin: '6px 0' }}>
              ₹{bakaya.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
              मासिक किराया: ₹{tenantRoom.rent} | कुल देय माह: {chargeableMonths} माह
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '700' }}>जमा एडवांस (Advance)</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#2563eb' }}>₹{tenantRoom.depositAmount || 0}</div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700' }}>सिक्योरिटी मनी (Security)</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803d' }}>₹{tenantRoom.security || 0}</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fefce8', border: '2px solid #fef08a', borderRadius: '14px', padding: '14px', marginBottom: '16px', fontSize: '12px', color: '#854d0e' }}>
            <strong style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#a16207' }}>📜 किराया व खाली करने के नियम (Terms & Conditions):</strong>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>किराया आपकी प्रवेश तारीख <strong>({tenantRoom.moveInDate})</strong> के आधार पर हर माह की उसी तारीख को जुड़ेगा।</li>
              <li>यदि आप 1 माह पूरा होने से पहले भी कमरा खाली करते हैं, तो नियमानुसार पूरे 1 माह का किराया देय होगा।</li>
              <li>तय मासिक तारीख के 1 दिन भी अतिरिक्त रुकने पर पूरे अगले माह का किराया देय होगा।</li>
            </ul>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '2px solid #cbd5e1', textAlign: 'center', marginBottom: '16px' }}>
            <strong style={{ fontSize: '16px', display: 'block', color: '#0f172a', marginBottom: '4px' }}>
              ⚡ ऑटो-अमाउंट UPI QR कोड
            </strong>
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              style={{ width: '180px', height: '180px', margin: '0 auto 10px auto', display: 'block', border: '2px solid #e2e8f0', borderRadius: '8px' }}
            />
            <a
              href={dynamicUpiUri}
              style={{ display: 'block', width: '92%', margin: '0 auto', backgroundColor: '#059669', color: '#fff', textDecoration: 'none', padding: '14px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '15px' }}
            >
              📲 सीधे PhonePe / GPay खोलें (Pay ₹{bakaya})
            </a>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', border: '2px solid #a7f3d0', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', color: '#065f46', display: 'block', marginBottom: '4px' }}>
              ✓ पेमेंट के बाद UTR जमा करें:
            </strong>
            <input
              type="number"
              placeholder="जमा की गई रकम (₹) *"
              value={utrForm.amount}
              onChange={e => setUtrForm({ ...utrForm, amount: e.target.value })}
              style={{ width: '92%', padding: '9px', fontSize: '14px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', fontWeight: '700' }}
            />
            <input
              type="text"
              placeholder="12-अंकों का UTR / Transaction No *"
              value={utrForm.utrNo}
              onChange={e => setUtrForm({ ...utrForm, utrNo: e.target.value })}
              style={{ width: '92%', padding: '9px', fontSize: '14px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontWeight: '700' }}
            />
            <button
              type="button"
              onClick={() => handleTenantAutoDepositUTR(tenantRoom)}
              style={{ width: '100%', backgroundColor: '#047857', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
            >
              वेरीफाई व ऑटो-डिपॉजिट करें
            </button>
          </div>

          <div style={{ backgroundColor: '#eff6ff', borderRadius: '14px', padding: '16px', border: '2px solid #bfdbfe', marginBottom: '16px' }}>
            <strong style={{ fontSize: '15px', color: '#1e40af', display: 'block', marginBottom: '8px' }}>📸 स्वयं बिजली मीटर रीडिंग दर्ज करें</strong>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginBottom: '10px' }}>पिछली रीडिंग: <strong>{tenantRoom.currentReading || tenantRoom.initialReading}</strong></div>
            <input
              type="number"
              placeholder="वर्तमान मीटर रीडिंग डालें *"
              value={tInput.curr}
              onChange={e => setMeterInputs({ ...meterInputs, [tenantRoom.id]: { ...tInput, curr: e.target.value } })}
              style={{ width: '92%', padding: '10px', fontSize: '15px', fontWeight: '700', borderRadius: '8px', border: '1px solid #93c5fd', marginBottom: '10px' }}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => handleMeterPhotoUpload(tenantRoom.id, e.target.files[0])}
              style={{ marginBottom: '10px', fontSize: '12px' }}
            />
            {tInput.meterPhoto && <img src={tInput.meterPhoto} alt="Preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />}
            <button onClick={() => handleTenantReadingSubmit(tenantRoom)} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
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
    <div style={{ maxWidth: '450px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', paddingBottom: '75px' }}>
      <header className="no-print" style={{ backgroundColor: '#0f172a', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: '#059669', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏠</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '900', lineHeight: '1.1' }}>Kiraya Manager</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              ID: {activeOwnerId} {isOwnerPro ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>⭐ PRO</span> : <span>({rooms.length}/{FREE_ROOM_LIMIT} Free)</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!isOwnerPro && (
            <button onClick={() => setShowPayModal(true)} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              ⚡ Pro
            </button>
          )}
          <button onClick={() => setShowChangeAdminPassModal(true)} style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
            🔑 Pass
          </button>
          <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
            🔒 Logout
          </button>
        </div>
      </header>

      {/* INDIVIDUAL ROOM DEDICATED DASHBOARD */}
      {selectedRoom ? (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button onClick={() => setSelectedRoomId(null)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              ← सभी कमरे देखें
            </button>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => openEditRoomModal(selectedRoom)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
                ✏️ एडिट
              </button>
              <button onClick={() => handleToggleRoomVacate(selectedRoom)} style={{ background: selectedRoom.status === 'occupied' ? '#fef3c7' : '#ecfdf5', color: selectedRoom.status === 'occupied' ? '#b45309' : '#047857', border: '1px solid', borderColor: selectedRoom.status === 'occupied' ? '#f59e0b' : '#10b981', padding: '6px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
                {selectedRoom.status === 'occupied' ? '🚪 खाली करें' : '🔑 Occupied करें'}
              </button>
            </div>
          </div>
          
          {/* Main Info Card */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '2px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '900' }}>{selectedRoom.roomNo} · {selectedRoom.tenant || 'खाली कमरा'}</div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>📞 {selectedRoom.phone || 'नंबर नहीं है'} · {selectedRoom.propName}</div>
                {selectedRoom.dob && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>🎂 जन्म तिथि: {selectedRoom.dob}</div>}
                {selectedRoom.idNumber && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>🆔 पहचान सं.: {selectedRoom.idNumber}</div>}
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  📅 प्रवेश तारीख: <strong>{selectedRoom.moveInDate}</strong> | कुल समय: <strong>{calculateChargeableMonths(selectedRoom)} माह</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>कुल बकाया:</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: getRoomBakaya(selectedRoom) > 0 ? '#dc2626' : '#059669' }}>₹{getRoomBakaya(selectedRoom).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', color: '#2563eb', fontWeight: '700' }}>
              <span>मासिक किराया: ₹{selectedRoom.rent}</span>
              <span>डिपॉजिट: ₹{selectedRoom.depositAmount || 0} | सिक्योरिटी: ₹{selectedRoom.security || 0}</span>
            </div>

            {selectedRoom.phone && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => sendWhatsAppBusinessReminder(selectedRoom)} style={{ flex: 1, backgroundColor: '#075E54', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                  🟢 WhatsApp
                </button>
                <button onClick={() => setQrModalRoom(selectedRoom)} style={{ flex: 1, backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  QR Code
                </button>
              </div>
            )}
          </div>

          {/* VIVARAN: ITEMIZED FINANCIAL SUMMARY */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '14px', border: '2px solid #e2e8f0', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px', color: '#0f172a' }}>📋 सम्पूर्ण मद-वार विवरण (Itemized Breakdown):</strong>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>कमरा किराया ({calculateChargeableMonths(selectedRoom)} माह):</span>
                <strong>₹{getRentTotalDue(selectedRoom)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>बिजली बिल कुल ({getBijliUnitsTotal(selectedRoom)} Unit):</span>
                <strong>₹{getBijliTotal(selectedRoom)}</strong>
              </div>
              {Number(selectedRoom.otherCharges) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>अन्य शुल्क ({selectedRoom.otherChargesNote || 'विविध'}):</span>
                  <strong>₹{selectedRoom.otherCharges}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                <span>कुल जमा राशि (Total Paid):</span>
                <strong>- ₹{getPaidTotal(selectedRoom)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: '900', fontSize: '14px', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                <span>कुल बाकी बकाया (Pending):</span>
                <span>₹{getRoomBakaya(selectedRoom)}</span>
              </div>
            </div>
          </div>

          {/* ITIHAS 1: PAYMENT HISTORY LIST */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '2px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>📜 जमा भुगतान इतिहास (Payment History)</strong>
              <button onClick={() => { setPaymentModalRoom(selectedRoom); setEditingPaymentId(null); setPaymentForm({ amount: String(getRoomBakaya(selectedRoom) || ''), mode: 'Cash', date: '2026-09-23', note: '' }); }} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}>
                + नया जमा
              </button>
            </div>

            {(selectedRoom.payments || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>अभी तक कोई भुगतान जमा नहीं हुआ है।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRoom.payments || []).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#059669', fontSize: '14px' }}>
                        ₹{p.amount} <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'normal' }}>({p.mode})</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        📅 {p.date} {p.note && `• ${p.note}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEditPayment(p, selectedRoom)} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>✏️</button>
                      <button onClick={() => handleDeletePayment(p.id, selectedRoom)} style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ITIHAS 2: ELECTRICITY READING HISTORY */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '2px solid #e2e8f0', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '10px', color: '#0f172a' }}>⚡ बिजली मीटर रीडिंग इतिहास (Electricity History)</strong>
            {(selectedRoom.electricityHistory || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>अभी तक कोई मीटर रीडिंग एंट्री नहीं है।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedRoom.electricityHistory || []).map(b => (
                  <div key={b.id} style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', color: '#0f172a' }}>खपत: {b.units} Unit</span>
                      <strong style={{ color: '#059669', fontSize: '13px' }}>₹{b.bill}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      रीडिंग: {b.prev} से {b.curr} (@ ₹{b.rate}/Unit) | 📅 {b.date}
                    </div>
                    {b.meterPhoto && (
                      <img src={b.meterPhoto} alt="Meter" style={{ width: '100%', maxHeight: '110px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTION: ADD NEW METER READING DIRECTLY */}
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', border: '2px solid #e2e8f0', marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>⚡ नई बिजली मीटर रीडिंग डालें</strong>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              पिछली रीडिंग: <strong>{selectedRoom.currentReading || selectedRoom.initialReading}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <input
                type="number"
                placeholder="वर्तमान रीडिंग"
                value={(meterInputs[selectedRoom.id] || {}).curr || ''}
                onChange={e => setMeterInputs({ ...meterInputs, [selectedRoom.id]: { ...(meterInputs[selectedRoom.id] || {}), curr: e.target.value } })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }}
              />
              <input
                type="number"
                placeholder="दर (₹10)"
                value={(meterInputs[selectedRoom.id] || {}).rate || '10'}
                onChange={e => setMeterInputs({ ...meterInputs, [selectedRoom.id]: { ...(meterInputs[selectedRoom.id] || {}), rate: e.target.value } })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }}
              />
            </div>
            <button onClick={() => handleSaveBijli(selectedRoom)} style={{ width: '100%', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>
              रीडिंग सेव करें
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: MAIN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>कुल कमरे (भरे/खाली)</div>
                  <div style={{ fontSize: '24px', fontWeight: '900' }}>{occupiedList.length} / {rooms.length - occupiedList.length}</div>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '12px', border: '2px solid #bfdbfe' }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700' }}>कुल एडवांस</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#2563eb' }}>₹{totalAdvanceAll.toLocaleString()}</div>
                </div>
                <div style={{ backgroundColor: '#ecfdf5', padding: '14px', borderRadius: '12px', border: '2px solid #a7f3d0' }}>
                  <div style={{ fontSize: '12px', color: '#065f46', fontWeight: '700' }}>कुल जमा</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#059669' }}>₹{totalJamaAll.toLocaleString()}</div>
                </div>
                <div style={{ backgroundColor: '#fef2f2', padding: '14px', borderRadius: '12px', border: '2px solid #fecaca' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '700' }}>कुल बाकी</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>₹{totalBakayaAll.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '900', margin: 0 }}>कमरे (डैशबोर्ड हेतु क्लिक करें)</h3>
                <button onClick={() => { 
                  if (!isOwnerPro && rooms.length >= FREE_ROOM_LIMIT) {
                    setShowPayModal(true);
                    return;
                  }
                  setEditingRoomId(null); 
                  setRoomForm({ propName: properties[0]?.name || '', roomNo: '', status: 'occupied', tenant: '', phone: '', dob: '', idNumber: '', pin: '', rent: '', security: '', depositAmount: '', otherCharges: '', otherChargesNote: '', moveInDate: '2026-09-10', initialReading: '' }); 
                  setShowAddRoom(true); 
                }} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                  + नया कमरा
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                    अभी तक कोई कमरा नहीं जोड़ा गया है। ऊपर <strong>+ नया कमरा</strong> पर क्लिक करें।
                  </div>
                ) : (
                  rooms.filter(r => propertyFilter === 'all' || r.propName === propertyFilter).map(room => (
                    <div key={room.id} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
                      <div onClick={() => setSelectedRoomId(room.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '16px', fontWeight: '900' }}>{room.roomNo} · {room.tenant || 'खाली'}</strong>
                            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: room.status === 'occupied' ? '#ecfdf5' : '#fef3c7', color: room.status === 'occupied' ? '#047857' : '#b45309' }}>
                              {room.status === 'occupied' ? 'Occupied' : 'Khali'}
                            </span>
                          </div>
                          <span style={{ color: getRoomBakaya(room) > 0 ? '#dc2626' : '#059669', fontWeight: '900', fontSize: '16px' }}>₹{getRoomBakaya(room).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>🏢 {room.propName} | किराया: ₹{room.rent}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                        <button onClick={() => openEditRoomModal(room)} style={{ flex: 1, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                          ✏️ किरायेदार एडिट
                        </button>
                        <button onClick={() => handleToggleRoomVacate(room)} style={{ flex: 1, backgroundColor: room.status === 'occupied' ? '#fffbeb' : '#ecfdf5', color: room.status === 'occupied' ? '#b45309' : '#047857', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                          {room.status === 'occupied' ? '🚪 खाली करें' : '🔑 Occupied करें'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTIES */}
          {activeTab === 'properties' && (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>मेरी प्रॉपर्टीज ({properties.length})</h2>
                <button onClick={() => { setEditingPropId(null); setPropForm({ name: '', address: '', pincode: '', locationUrl: '', photo: '', caretakerName: '', caretakerPhone: '', caretakerPhoto: '' }); setShowAddProperty(true); }} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                  + नई प्रॉपर्टी
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {properties.map(p => {
                  const propRooms = rooms.filter(r => r.propName === p.name);
                  return (
                    <div key={p.id} style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                      <img src={p.photo || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&q=60'} alt={p.name} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '17px', fontWeight: '900' }}>{p.name}</strong>
                          <button onClick={() => { setEditingPropId(p.id); setPropForm({ ...p }); setShowAddProperty(true); }} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>✏️ Edit</button>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>📍 {p.address} ({p.pincode})</div>
                        
                        {p.locationUrl && (
                          <div style={{ margin: '4px 0' }}>
                            <a href={p.locationUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700', textDecoration: 'none' }}>
                              🗺️ गूगल मैप लोकेशन खोलें →
                            </a>
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: '#475569', margin: '4px 0' }}>👤 देखरेख: {p.caretakerName} ({p.caretakerPhone})</div>

                        <button
                          onClick={() => {
                            setPropertyFilter(p.name);
                            setActiveTab('dashboard');
                          }}
                          style={{ width: '100%', marginTop: '10px', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
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

          {/* TAB 3: KHATA BAHI (LEDGER) */}
          {activeTab === 'khata' && (
            <div style={{ padding: '16px' }}>
              <h2 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: '900' }}>📖 खाता बही (Ledger Summary)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rooms.map(room => {
                  const rent = getRentTotalDue(room);
                  const bijli = getBijliTotal(room);
                  const paid = getPaidTotal(room);
                  const bakaya = getRoomBakaya(room);

                  return (
                    <div key={room.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '16px' }}>{room.roomNo}</strong> ({room.tenant || 'खाली'})
                          <div style={{ fontSize: '11px', color: '#64748b' }}>🏢 {room.propName}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>बकाया:</span>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: bakaya > 0 ? '#dc2626' : '#059669' }}>₹{bakaya.toLocaleString()}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#475569', margin: '8px 0', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                        किराया बिल: <strong>₹{rent}</strong> | बिजली बिल: <strong>₹{bijli}</strong> | कुल जमा: <strong style={{ color: '#059669' }}>₹{paid}</strong>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setSelectedRoomId(room.id)} style={{ flex: 1, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          🔍 विवरण व इतिहास देखें
                        </button>
                        <button onClick={() => { setPaymentModalRoom(room); setEditingPaymentId(null); setPaymentForm({ amount: String(bakaya || ''), mode: 'Cash', date: '2026-09-23', note: '' }); }} style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                          + जमा दर्ज करें
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED REPORT DASHBOARD */}
          {activeTab === 'report' && (
            <div style={{ padding: '16px' }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>📊 विस्तृत रिपोर्ट (Statement)</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleShareReport} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📤 शेयर करें (WhatsApp)
                  </button>
                  <button onClick={() => window.print()} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
                    🖨️ Print / PDF
                  </button>
                </div>
              </div>

              {/* FILTERS */}
              <div className="no-print" style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '12px', border: '2px solid #cbd5e1', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>प्रॉपर्टी चुनें:</label>
                    <select value={reportFilter.propName} onChange={e => setReportFilter({ ...reportFilter, propName: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontWeight: '700' }}>
                      <option value="all">सभी प्रॉपर्टीज</option>
                      {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>कमरा चुनें:</label>
                    <select value={reportFilter.roomId} onChange={e => setReportFilter({ ...reportFilter, roomId: e.target.value })} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontWeight: '700' }}>
                      <option value="all">सभी कमरे (All Rooms)</option>
                      {rooms
                        .filter(r => reportFilter.propName === 'all' || r.propName === reportFilter.propName)
                        .map(r => <option key={r.id} value={r.id}>{r.roomNo}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>तारीख से (Start Date):</label>
                    <input type="date" value={reportFilter.startDate} onChange={e => setReportFilter({ ...reportFilter, startDate: e.target.value })} style={{ width: '90%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>तारीख तक (End Date):</label>
                    <input type="date" value={reportFilter.endDate} onChange={e => setReportFilter({ ...reportFilter, endDate: e.target.value })} style={{ width: '90%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }} />
                  </div>
                </div>
              </div>

              {/* PRINTABLE PDF REPORT VIEW */}
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '2px solid #cbd5e1' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '900' }}>
                    {reportFilter.propName === 'all' ? 'समस्त प्रॉपर्टीज किराया व बिजली विवरण रिपोर्ट' : reportFilter.propName}
                  </h2>
                  {reportFilter.propName !== 'all' && (() => {
                    const currentProp = properties.find(p => p.name === reportFilter.propName);
                    if (!currentProp) return null;
                    return (
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                        <div>📍 पता: {currentProp.address} - पिन: {currentProp.pincode}</div>
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    दिनांक: {new Date().toLocaleDateString('hi-IN')} {reportFilter.startDate && `| अवधि: ${reportFilter.startDate} से ${reportFilter.endDate}`}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #0f172a', backgroundColor: '#f1f5f9' }}>
                        <th style={{ padding: '6px 4px' }}>कमरा</th>
                        <th style={{ padding: '6px 4px' }}>किरायेदार</th>
                        <th style={{ padding: '6px 4px' }}>कमरा किराया</th>
                        <th style={{ padding: '6px 4px' }}>बिजली रीडिंग व बिल</th>
                        <th style={{ padding: '6px 4px' }}>जमा राशि, तारीख व माध्यम</th>
                        <th style={{ padding: '6px 4px', color: '#dc2626' }}>कुल बकाया</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms
                        .filter(r => reportFilter.propName === 'all' || r.propName === reportFilter.propName)
                        .filter(r => reportFilter.roomId === 'all' || r.id === reportFilter.roomId)
                        .map(r => {
                          const initialR = Number(r.initialReading || 0);
                          const currentR = Number(r.currentReading || r.initialReading || 0);
                          const totalUnits = getBijliUnitsTotal(r);
                          const bijliBill = getBijliTotal(r);
                          const paymentsList = r.payments || [];

                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                              <td style={{ padding: '6px 4px', fontWeight: '900' }}>{r.roomNo}</td>
                              <td style={{ padding: '6px 4px' }}>{r.tenant || 'खाली'}</td>
                              <td style={{ padding: '6px 4px' }}>₹{getRentTotalDue(r)} ({calculateChargeableMonths(r)} माह)</td>
                              <td style={{ padding: '6px 4px' }}>
                                <strong>₹{bijliBill}</strong>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>({initialR} से {currentR} = {totalUnits} Units)</div>
                                <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: '700', marginTop: '2px' }}>{getPaidUnitsStatus(r)}</div>
                              </td>
                              
                              <td style={{ padding: '6px 4px' }}>
                                <div style={{ color: '#059669', fontWeight: '800', marginBottom: '4px' }}>
                                  कुल जमा: ₹{getPaidTotal(r)}
                                </div>
                                {paymentsList.length === 0 ? (
                                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>कोई जमा नहीं</span>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {paymentsList.map(p => (
                                      <div key={p.id} style={{ fontSize: '10px', backgroundColor: '#f8fafc', padding: '3px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <strong>₹{p.amount}</strong> ({p.mode}) — 📅 {p.date} {p.note && `[${p.note}]`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '6px 4px', color: '#dc2626', fontWeight: '900', fontSize: '13px' }}>
                                ₹{getRoomBakaya(r)}
                              </td>
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

      {/* 1. ADMIN CHANGE PASSWORD MODAL */}
      {showChangeAdminPassModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '340px', borderRadius: '14px', padding: '18px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '17px', fontWeight: '900' }}>🔑 मकान मालिक पासवर्ड बदलें</h3>
            <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>वर्तमान पासवर्ड *</label>
                <input
                  type="password"
                  placeholder="पुराना पासवर्ड डालें"
                  value={changePassForm.currentPassword}
                  onChange={e => setChangePassForm({ ...changePassForm, currentPassword: e.target.value })}
                  style={{ width: '92%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>नया 8-अक्षर पासवर्ड *</label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="ठीक 8 अक्षर का नया पासवर्ड"
                  value={changePassForm.newPassword}
                  onChange={e => setChangePassForm({ ...changePassForm, newPassword: e.target.value })}
                  style={{ width: '92%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '800' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>कन्फर्म नया पासवर्ड *</label>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="नया पासवर्ड दोबारा डालें"
                  value={changePassForm.confirmPassword}
                  onChange={e => setChangePassForm({ ...changePassForm, confirmPassword: e.target.value })}
                  style={{ width: '92%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '800' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer' }}>अपडेट करें</button>
                <button type="button" onClick={() => setShowChangeAdminPassModal(false)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2 & 3. MODAL: ADD / EDIT ROOM */}
      {showAddRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '370px', borderRadius: '14px', padding: '18px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '17px', fontWeight: '900' }}>{editingRoomId ? '✏️ कमरा व किरायेदार विवरण सुधारें' : '+ नया कमरा जोड़ें'}</h3>
            <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select value={roomForm.propName} onChange={e => setRoomForm({ ...roomForm, propName: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }}>
                <option value="">प्रॉपर्टी चुनें *</option>
                {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <input placeholder="कमरा नंबर (101) *" value={roomForm.roomNo} onChange={e => setRoomForm({ ...roomForm, roomNo: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }} required />
                <select value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '800' }}>
                  <option value="occupied">Occupied (भरा हुआ)</option>
                  <option value="vacant">Khali (खाली)</option>
                </select>
              </div>

              {roomForm.status === 'occupied' && (
                <>
                  <input placeholder="किरायेदार का नाम *" value={roomForm.tenant} onChange={e => setRoomForm({ ...roomForm, tenant: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }} required />
                  
                  <input 
                    placeholder="मोबाइल नंबर (10 अंक) *" 
                    value={roomForm.phone} 
                    onChange={e => {
                      const newPhone = e.target.value;
                      const newAutoPin = generateAutoPin(newPhone, roomForm.dob);
                      setRoomForm({ 
                        ...roomForm, 
                        phone: newPhone, 
                        pin: newAutoPin || roomForm.pin 
                      });
                    }} 
                    style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                    required 
                  />

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>जन्म तिथि (DOB) *:</label>
                    <input 
                      type="date" 
                      value={roomForm.dob} 
                      onChange={e => {
                        const newDob = e.target.value;
                        const newAutoPin = generateAutoPin(roomForm.phone, newDob);
                        setRoomForm({ 
                          ...roomForm, 
                          dob: newDob, 
                          pin: newAutoPin || roomForm.pin 
                        });
                      }} 
                      style={{ width: '92%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>पहचान पत्र / दस्तावेज संख्या:</label>
                    <input 
                      placeholder="पहचान पत्र संख्या दर्ज करें" 
                      value={roomForm.idNumber} 
                      onChange={e => setRoomForm({ ...roomForm, idNumber: e.target.value })} 
                      style={{ width: '92%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                    />
                  </div>

                  <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af' }}>
                      🔐 ऑटो-जेनरेटेड लॉगिन पासवर्ड:
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#1d4ed8', marginTop: '2px' }}>
                      {generateAutoPin(roomForm.phone, roomForm.dob) || roomForm.pin || 'Phone और DOB डालने पर बनेगा'}
                    </div>
                    <span style={{ fontSize: '10px', color: '#3b82f6' }}>(मोबाइल अंतिम 4 अंक + जन्म वर्ष YYYY)</span>
                  </div>
                </>
              )}

              <input type="number" placeholder="मासिक किराया (₹) *" value={roomForm.rent} onChange={e => setRoomForm({ ...roomForm, rent: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }} required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>सिक्योरिटी मनी (₹):</label>
                  <input type="number" placeholder="उदा. 5000" value={roomForm.security} onChange={e => setRoomForm({ ...roomForm, security: e.target.value })} style={{ width: '85%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>एडवांस डिपॉजिट (₹):</label>
                  <input type="number" placeholder="उदा. 2000" value={roomForm.depositAmount} onChange={e => setRoomForm({ ...roomForm, depositAmount: e.target.value })} style={{ width: '85%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>

              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>प्रवेश तारीख (Cycle Date):</label>
              <input type="date" value={roomForm.moveInDate} onChange={e => setRoomForm({ ...roomForm, moveInDate: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
              <input type="number" placeholder="शुरुआती मीटर रीडिंग *" value={roomForm.initialReading} onChange={e => setRoomForm({ ...roomForm, initialReading: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer' }}>सुरक्षित करें</button>
                <button type="button" onClick={() => setShowAddRoom(false)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PROPERTY */}
      {showAddProperty && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '370px', borderRadius: '14px', padding: '18px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '17px', fontWeight: '900' }}>{editingPropId ? 'प्रॉपर्टी विवरण सुधारें' : '+ नई प्रॉपर्टी जोड़ें'}</h3>
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
            }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input placeholder="प्रॉपर्टी नाम (उदा. श्याम भवन) *" value={propForm.name} onChange={e => setPropForm({ ...propForm, name: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
              <input placeholder="पूरा पता *" value={propForm.address} onChange={e => setPropForm({ ...propForm, address: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
              <input placeholder="पिन कोड *" value={propForm.pincode} onChange={e => setPropForm({ ...propForm, pincode: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
              <input placeholder="गूगल मैप लोकेशन लिंक (Google Maps URL)" value={propForm.locationUrl} onChange={e => setPropForm({ ...propForm, locationUrl: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input placeholder="बिल्डिंग फोटो URL" value={propForm.photo} onChange={e => setPropForm({ ...propForm, photo: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <input placeholder="केयरटेकर नाम *" value={propForm.caretakerName} onChange={e => setPropForm({ ...propForm, caretakerName: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
              <input placeholder="केयरटेकर फोन *" value={propForm.caretakerPhone} onChange={e => setPropForm({ ...propForm, caretakerPhone: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} required />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer' }}>सुरक्षित करें</button>
                <button type="button" onClick={() => setShowAddProperty(false)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT ENTRY */}
      {paymentModalRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '360px', borderRadius: '14px', padding: '18px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '900' }}>💰 किराया जमा — {paymentModalRoom.roomNo}</h3>
            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="number" placeholder="राशि (₹) *" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} style={{ padding: '10px', border: '2px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', fontWeight: '900' }} required />
              <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }} required />
              <select value={paymentForm.mode} onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700' }}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Transfer</option>
              </select>
              <input placeholder="विवरण (उदा. सितंबर किराया)" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer' }}>सेव करें</button>
                <button type="button" onClick={() => setPaymentModalRoom(null)} style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', padding: '10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>रद्द</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTO QR PREVIEW */}
      {qrModalRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '340px', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '16px', fontWeight: '900' }}>{qrModalRoom.roomNo} का ऑटो QR</strong>
              <span onClick={() => setQrModalRoom(null)} style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>✕</span>
            </div>
            
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`upi://pay?pa=${payConfig.upiId}&pn=${encodeURIComponent(payConfig.accHolder)}&am=${getRoomBakaya(qrModalRoom)}&cu=INR&tn=Rent_${encodeURIComponent(qrModalRoom.roomNo)}`)}`}
              alt="Payment QR"
              style={{ width: '200px', height: '200px', margin: '0 auto 12px', display: 'block', border: '2px solid #e2e8f0', borderRadius: '10px' }}
            />

            <div style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626', marginBottom: '4px' }}>
              ₹{getRoomBakaya(qrModalRoom).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: '800', marginBottom: '12px' }}>
              UPI ID: {payConfig.upiId}
            </div>

            <button
              onClick={() => triggerUpiPayment(qrModalRoom)}
              style={{ width: '100%', backgroundColor: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}
            >
              📲 Pay Now खोलें
            </button>
            <button
              onClick={() => setQrModalRoom(null)}
              style={{ width: '100%', border: '1px solid #cbd5e1', background: '#fff', padding: '8px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              बंद करें
            </button>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION UPGRADE MODAL */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 99999 }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '380px', borderRadius: '16px', padding: '20px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowPayModal(false)} style={{ position: 'absolute', top: '12px', right: '14px', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>

            <span style={{ fontSize: '36px' }}>👑</span>
            <h3 style={{ margin: '6px 0 4px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>Kiraya Manager Pro Upgrade</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
              आपकी 5-कमरों की Free सीमा पूरी हो चुकी है। असीमित कमरों के लिए प्लान चुनें:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div
                onClick={() => setSelectedPlan('monthly')}
                style={{ border: selectedPlan === 'monthly' ? '2px solid #059669' : '1px solid #cbd5e1', padding: '10px 6px', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedPlan === 'monthly' ? '#ecfdf5' : '#fff' }}
              >
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>Pro Monthly</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669', margin: '4px 0' }}>₹199 / माह</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>अनलिमिटेड कमरे</div>
              </div>

              <div
                onClick={() => setSelectedPlan('annual')}
                style={{ border: selectedPlan === 'annual' ? '2px solid #2563eb' : '1px solid #cbd5e1', padding: '10px 6px', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedPlan === 'annual' ? '#eff6ff' : '#fff', position: 'relative' }}
              >
                <span style={{ position: 'absolute', top: '-7px', right: '6px', backgroundColor: '#dc2626', color: '#fff', fontSize: '8px', padding: '1px 5px', borderRadius: '8px', fontWeight: '900' }}>SAVE 35%</span>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>Pro Annual</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#2563eb', margin: '4px 0' }}>₹1,499 / वर्ष</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>पूरे साल की बचत</div>
              </div>
            </div>

            <a
              href={ownerUpiUri}
              style={{ display: 'block', backgroundColor: '#059669', color: '#fff', textDecoration: 'none', padding: '11px', borderRadius: '8px', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}
            >
              📲 Pay ₹{planAmount} via PhonePe / GPay / Paytm
            </a>

            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>या नीचे QR कोड स्कैन करके पे करें:</div>

            <img
              src={ownerQrUrl}
              alt="Admin UPI QR"
              style={{ width: '150px', height: '150px', margin: '0 auto 8px auto', display: 'block', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />

            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
              UPI ID: <b>{ADMIN_UPI}</b>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>पेमेंट के बाद 12-अंक UPI Ref / UTR दर्ज करें:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="उदा: 426812345678"
                  value={subUtr}
                  onChange={e => setSubUtr(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700' }}
                />
                <button
                  onClick={submitSubscriptionUtr}
                  style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}
                >
                  Activate
                </button>
              </div>
            </div>

            {subSuccess && (
              <div style={{ marginTop: '10px', backgroundColor: '#ecfdf5', color: '#065f46', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>
                {subSuccess}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION */}
      <nav className="no-print" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '450px', height: '60px', backgroundColor: '#fff', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000 }}>
        {[
          { id: 'dashboard', label: 'डैशबोर्ड', icon: '⊞' },
          { id: 'properties', label: 'प्रॉपर्टी', icon: '🏢' },
          { id: 'khata', label: 'खाता बही', icon: '📖' },
          { id: 'report', label: 'रिपोर्ट', icon: '📄' }
        ].map(item => (
          <button key={item.id} onClick={() => { setSelectedRoomId(null); setActiveTab(item.id); }} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === item.id ? '#059669' : '#64748b', cursor: 'pointer', flex: 1 }}>
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: activeTab === item.id ? '900' : '600' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body { background-color: #fff !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
