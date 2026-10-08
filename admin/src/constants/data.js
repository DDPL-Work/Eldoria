export const DEFAULT_CITIES = [
  { id: 'mumbai', name: 'Mumbai', order: 1 },
  { id: 'thane', name: 'Thane', order: 2 },
  { id: 'navi-mumbai', name: 'Navi Mumbai', order: 3 },
  { id: 'pune', name: 'Pune', order: 4 },
  { id: 'nashik', name: 'Nashik', order: 5 },
  { id: 'nagpur', name: 'Nagpur', order: 6 },
  { id: 'delhi', name: 'Delhi', order: 7 },
  { id: 'gurugram', name: 'Gurugram', order: 8 },
  { id: 'noida', name: 'Noida', order: 9 },
  { id: 'bengaluru', name: 'Bengaluru', order: 10 },
  { id: 'hyderabad', name: 'Hyderabad', order: 11 },
  { id: 'chennai', name: 'Chennai', order: 12 },
  { id: 'kolkata', name: 'Kolkata', order: 13 },
  { id: 'ahmedabad', name: 'Ahmedabad', order: 14 },
  { id: 'surat', name: 'Surat', order: 15 },
  { id: 'jaipur', name: 'Jaipur', order: 16 },
  { id: 'lucknow', name: 'Lucknow', order: 17 },
  { id: 'chandigarh', name: 'Chandigarh', order: 18 },
  { id: 'indore', name: 'Indore', order: 19 },
  { id: 'goa', name: 'Goa', order: 20 },
  { id: 'dehradun', name: 'Dehradun', order: 21 }
];

export const PLANS = ['Single visit', '12-hr shift', '24-hr live-in'];
export const SLOTS = ['7:00 AM', '9:00 AM', '11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM'];
export const RELATIONS = ['Mother', 'Father', 'Self', 'Spouse', 'Grandparent', 'Other'];

export const ST = {
  requested: { label: 'Request received', cls: 'bg-[#FDF0D9] text-[#8A5000]' },
  confirmed: { label: 'Confirmed', cls: 'bg-[#E4ECF7] text-[#0E2F5A]' },
  assigned: { label: 'Staff assigned', cls: 'bg-[#E4ECF7] text-[#0E2F5A]' },
  on_the_way: { label: 'On the way', cls: 'bg-[#FDF0D9] text-[#8A5000]' },
  in_progress: { label: 'Visit in progress', cls: 'bg-[#FDF0D9] text-[#8A5000]' },
  completed: { label: 'Completed', cls: 'bg-[#E3F4EA] text-[#1E6B42]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#FBE7E7] text-[#A12B2B]' }
};

export const FLOW = ['requested', 'confirmed', 'assigned', 'on_the_way', 'in_progress', 'completed'];
export const FLOW_TXT = {
  requested: 'Request received',
  confirmed: 'Booking confirmed',
  assigned: 'Staff assigned',
  on_the_way: 'Staff on the way',
  in_progress: 'Visit in progress',
  completed: 'Visit completed'
};
export const ACTIVE = ['requested', 'confirmed', 'assigned', 'on_the_way', 'in_progress'];

export const ENQ_ST = {
  new: ['New', 'bg-[#FDF0D9] text-[#8A5000]'],
  contacted: ['Contacted', 'bg-[#E4ECF7] text-[#0E2F5A]'],
  converted: ['Booked', 'bg-[#E3F4EA] text-[#1E6B42]'],
  closed: ['Closed', 'bg-[#EAF0F7] text-[#566275]']
};

export const APPR = {
  pending: ['Under review', 'bg-[#FDF0D9] text-[#8A5000]'],
  changes: ['Changes requested', 'bg-[#E4ECF7] text-[#0E2F5A]'],
  approved: ['Approved', 'bg-[#E3F4EA] text-[#1E6B42]'],
  rejected: ['Not approved', 'bg-[#FBE7E7] text-[#A12B2B]']
};

export const OB_DOCS = [
  { k: 'photo', label: 'Profile photo', hint: 'A clear photo of your face on a plain background', req: true },
  { k: 'idProof', label: 'Photo ID proof', hint: 'Aadhaar, PAN, Voter ID, Passport or Driving licence', req: true },
  { k: 'qualification', label: 'Qualification certificate', hint: 'GNM, ANM, B.Sc Nursing, BPT or caregiver course', req: true },
  { k: 'experience', label: 'Experience letter', hint: 'From a hospital, agency or previous employer', req: false },
  { k: 'police', label: 'Police verification', hint: 'If you already have one', req: false }
];

export const OB_ROLES = [
  'GNM Nurse',
  'ANM Nurse',
  'B.Sc Nurse',
  'ICU Nurse',
  'Elder Caregiver',
  'Patient Attendant',
  'Baby Care Nanny',
  'Physiotherapist'
];

export const OB_SKILLS = [
  'Elder care',
  'Dementia / Alzheimer’s care',
  'Bedridden care',
  'ICU care',
  'Medication support',
  'Injections & IV',
  'Wound dressing',
  'Catheter care',
  'Ryles tube care',
  'Vital monitoring',
  'Post-surgery care',
  'Stroke & paralysis care',
  'Cancer & palliative care',
  'Parkinson’s care',
  'Newborn & baby care',
  'Mother & baby support',
  'Physiotherapy',
  'Night shifts',
  'Live-in care'
];

export const UNITS = ['per visit', 'per session', 'per shift', 'per day', 'per week', 'per month', 'one-time'];
export const KINDS = [
  ['care', 'Care service (staff visit)'],
  ['equipment', 'Medical equipment (rent / buy)'],
  ['doctor', 'Doctor service']
];

export const ATABS = [
  ['dashboard', 'grid', 'Dashboard'],
  ['bookings', 'cal', 'Bookings'],
  ['enquiries', 'help', 'Help requests'],
  ['staff', 'users', 'Staff'],
  ['onboarding', 'shield', 'Onboarding'],
  ['clients', 'user', 'Clients'],
  ['cities', 'pin', 'Cities'],
  ['services', 'cross', 'Services & pricing'],
  ['alerts', 'bell', 'Notifications'],
  ['settings', 'gear', 'Settings']
];

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const pad = (n) => String(n).padStart(2, '0');
export const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => iso(new Date());

export const slotKey = (t) => {
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || '');
  if (!m) return '99';
  let h = (+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return pad(h) + m[2];
};

export const byDateTime = (a, b) =>
  ((a.date || '') + slotKey(a.time)).localeCompare((b.date || '') + slotKey(b.time));


export function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  const t = todayISO();
  if (s === t) return 'Today';
  const tm = new Date();
  tm.setDate(tm.getDate() + 1);
  if (s === iso(tm)) return 'Tomorrow';
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function fmtTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const h = d.getHours();
  const m = pad(d.getMinutes());
  const tt = `${(h % 12) || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  return iso(d) === todayISO() ? tt : `${d.getDate()} ${MON[d.getMonth()]}, ${tt}`;
}

export function initials(n) {
  return String(n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function telHref(n) {
  return 'tel:+91' + digits(n);
}

export function waHref(n, text) {
  return 'https://wa.me/91' + digits(n) + (text ? '?text=' + encodeURIComponent(text) : '');
}

export function money(v) {
  return Number(v) > 0 ? '₹' + Number(v).toLocaleString('en-IN') : 'Price on confirmation';
}

export function priceLabel(x) {
  return x && x.priceMode !== 'contact' && Number(x.price) > 0
    ? '₹' + Number(x.price).toLocaleString('en-IN') + (x.unit ? ' ' + x.unit : '')
    : 'Contact for price';
}

export function ageOf(dob) {
  if (!dob) return 0;
  const d = new Date(dob + 'T00:00:00');
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

export function starterCatalog() {
  const CARE_OPTS = ['Single visit', '12-hr shift', '24-hr live-in'];
  const VISIT_OPTS = ['Single visit', 'Daily visits'];
  const T_ELDER = ['Personal hygiene', 'Meals & hydration', 'Assisted walk', 'Medication reminder'];
  const T_NURSE = ['Check BP & SpO₂', 'Check blood sugar', 'Give medication as prescribed', 'Update family on visit'];
  const T_PHYSIO = ['Assessment', 'Guided exercises', 'Home exercise plan'];
  const T_EQUIP = ['Deliver & install', 'Demo to family', 'Safety check'];

  const cats = [
    ['elder', 'Elder Care', 'Daily care, company and supervision for senior citizens.', 'heart', 'care'],
    ['nursingcare', 'Home Nursing', 'Qualified nurses for clinical care at home.', 'cross', 'care'],
    ['caregivers', 'Caregiver & Patient Attendant', 'Trained caregivers and attendants, by shift or live-in.', 'users', 'care'],
    ['special', 'Specialized Patient Care', 'Long-term and condition-specific care at home.', 'shield', 'care'],
    ['babycare', 'Baby Care', 'Newborn care, baby sitting and support for new mothers.', 'baby', 'care'],
    ['physiotherapy', 'Physiotherapy', 'Home physiotherapy and rehabilitation sessions.', 'walker', 'care'],
    ['equipment', 'Medical Equipment', 'Hospital beds, wheelchairs, oxygen and more on rent or sale.', 'wheelchair', 'equipment'],
    ['doctors', 'Doctor Services', 'Doctor consultations and home visits.', 'steth', 'doctor', true]
  ];

  const categories = {};
  cats.forEach(([id, name, desc, icon, kind, soon], i) => {
    categories[id] = { name, desc, icon, kind, order: i + 1, enabled: true, comingSoon: !!soon };
  });

  const S = [];
  const add = (cat, id, name, icon, desc, opts, tasks, price, unit) =>
    S.push({ id, categoryId: cat, name, icon, desc, options: opts, tasks, price: price || 0, priceMode: price ? 'fixed' : 'contact', unit: unit || 'per visit', enabled: true });

  add('elder', 'senior', 'Senior Citizen Care', 'heart', 'All-round daily support for senior citizens at home.', CARE_OPTS, T_ELDER);
  add('elder', 'caregiver', 'Elderly Care', 'heart', 'Daily living support: bathing, feeding, mobility and company.', CARE_OPTS, T_ELDER, 1500, 'per shift');
  add('elder', 'companion', 'Companionship & Supervision', 'users', 'Friendly company, conversation and safety supervision.', CARE_OPTS, ['Conversation & activities', 'Safety supervision', 'Walk outdoors', 'Update family']);
  add('elder', 'dementia', 'Dementia Care', 'brain', 'Patient, trained care for memory loss and confusion.', CARE_OPTS, ['Routine & reminders', 'Safety supervision', 'Meals & hygiene', 'Calming activities']);
  add('elder', 'bedridden', 'Bedridden Patient Care', 'bed', 'Hygiene, position changes and bed-sore prevention.', CARE_OPTS, ['Sponge bath & hygiene', 'Turn every 2 hours', 'Feeding', 'Bed-sore check']);
  add('elder', 'posthosp', 'Post-Hospitalization Care', 'home', 'Recovery support in the first weeks after discharge.', CARE_OPTS, T_NURSE);
  add('elder', 'daycare', 'Day Care', 'sun', 'Daytime care while the family is at work.', ['Day care (8 hrs)', 'Day care (10 hrs)'], T_ELDER);
  add('elder', 'nightcare', 'Night Care', 'moon', 'Overnight care and monitoring so the family can rest.', ['Night shift (12 hrs)'], ['Night monitoring', 'Toilet assistance', 'Medication on time', 'Morning handover']);
  add('nursingcare', 'nursing', 'Home Nursing', 'cross', 'Qualified GNM/ANM nurse for vitals, medication and clinical care.', CARE_OPTS, T_NURSE, 1200);
  add('nursingcare', 'generalnursing', 'General Nursing Care', 'cross', 'Routine nursing care for patients recovering at home.', CARE_OPTS, T_NURSE);
  add('nursingcare', 'icu', 'ICU Care at Home', 'monitor', 'Critical-care trained nurses with equipment support.', ['12-hr shift', '24-hr live-in'], ['Monitor vitals & machines', 'Suctioning as needed', 'Medication & IV', 'Hourly chart']);
  add('nursingcare', 'medication', 'Medication Support', 'pill', 'Correct medicines at the correct time, every day.', VISIT_OPTS, ['Check prescription', 'Give medicines', 'Record in chart']);
  add('nursingcare', 'injection', 'Injection Support', 'syringe', 'IM/IV/subcutaneous injections given by a nurse.', VISIT_OPTS, ['Verify prescription', 'Give injection', 'Dispose waste safely'], 500);
  add('nursingcare', 'wound', 'Wound Dressing', 'bandage', 'Sterile wound and surgical dressing at home.', VISIT_OPTS, ['Clean wound', 'Change dressing', 'Check for infection']);
  add('nursingcare', 'catheter', 'Catheter Care', 'droplet', 'Catheter insertion, change and care.', VISIT_OPTS, ['Catheter hygiene', 'Change bag', 'Check for infection']);
  add('nursingcare', 'ryles', 'Ryles Tube Care', 'tube', 'Ryles tube insertion, feeding and care.', VISIT_OPTS, ['Check tube position', 'Tube feeding', 'Clean & secure tube']);
  add('nursingcare', 'vitals', 'Vital Monitoring', 'pulse', 'Regular BP, sugar, SpO₂ and temperature checks.', VISIT_OPTS, ['BP & pulse', 'Blood sugar', 'SpO₂ & temperature', 'Share report']);
  add('caregivers', 'patientcg', 'Patient Caregiver', 'users', 'Trained caregiver for patients recovering at home.', CARE_OPTS, T_ELDER);
  add('caregivers', 'eldercg', 'Elder Caregiver', 'heart', 'Caregiver for elderly parents and grandparents.', CARE_OPTS, T_ELDER);
  add('caregivers', 'malecg', 'Male Caregiver', 'male', 'Male caregiver, helpful for lifting and male patients.', CARE_OPTS, T_ELDER);
  add('caregivers', 'femalecg', 'Female Caregiver', 'female', 'Female caregiver for women and elderly patients.', CARE_OPTS, T_ELDER);
  add('caregivers', 'care12', '12-Hour Care', 'clock', 'Day or night caregiver for a 12-hour shift.', ['12-hr day shift', '12-hr night shift'], T_ELDER);
  add('caregivers', 'attendant', '24-Hour Care', 'clock', 'Round-the-clock care with a caregiver on duty.', ['24-hr live-in'], ['Shift handover', 'Hygiene & meals', 'Night monitoring'], 2200, 'per day');
  add('caregivers', 'livein', 'Live-in Caregiver', 'home', 'Caregiver who stays at home, by week or month.', ['1 week', '1 month'], T_ELDER);
  add('special', 'stroke', 'Stroke Patient Care', 'brain', 'Care and daily rehab support after a stroke.', CARE_OPTS, ['Positioning & mobility', 'Feeding support', 'Exercises as advised', 'Vitals check']);
  add('special', 'paralysis', 'Paralysis Care', 'bed', 'Care for patients with partial or full paralysis.', CARE_OPTS, ['Turn & position', 'Hygiene', 'Passive exercises', 'Bed-sore check']);
  add('special', 'postsurgery', 'Post-Surgery Care', 'bed', 'Recovery care after hospital discharge, wound and mobility care.', CARE_OPTS, ['Wound check & dressing', 'Pain & vitals check', 'Mobility exercises', 'Medication as prescribed'], 1800);
  add('special', 'cancer', 'Cancer Patient Care', 'ribbon', 'Gentle care during treatment and recovery.', CARE_OPTS, ['Medication on time', 'Nutrition support', 'Comfort care', 'Vitals check']);
  add('special', 'palliative', 'Palliative Care', 'hand', 'Comfort-focused care for serious illness.', CARE_OPTS, ['Pain & comfort care', 'Hygiene', 'Emotional support', 'Family updates']);
  add('special', 'parkinsons', 'Parkinson’s Care', 'pulse', 'Support with movement, routines and medication.', CARE_OPTS, ['Medication on time', 'Assisted walk', 'Fall prevention', 'Exercises']);
  add('special', 'alzheimers', 'Alzheimer’s / Dementia Care', 'brain', 'Specialised memory care with a safe routine.', CARE_OPTS, ['Routine & reminders', 'Safety supervision', 'Meals & hygiene', 'Calming activities']);
  add('babycare', 'newborn', 'Newborn Baby Care', 'baby', 'Trained nanny for newborn feeding, bathing and sleep.', ['12-hr shift', '24-hr live-in'], ['Bathing & massage', 'Feeding support', 'Sleep routine', 'Hygiene']);
  add('babycare', 'babysitter', 'Baby Sitter', 'baby', 'Safe, caring baby sitter at home.', ['4-hr visit', '8-hr shift', '12-hr shift'], ['Play & feeding', 'Nap time', 'Hygiene']);
  add('babycare', 'motherbaby', 'Mother & Baby Support', 'heart', 'Care for the new mother and baby after delivery.', ['12-hr shift', '24-hr live-in'], ['Mother care & diet', 'Baby bath & massage', 'Feeding support']);
  add('physiotherapy', 'physio', 'Home Physiotherapy', 'walker', 'Home physio sessions for pain, injury and mobility.', ['Single session', '5 sessions', '10 sessions'], T_PHYSIO, 900, 'per session');
  add('physiotherapy', 'elderphysio', 'Elderly Physiotherapy', 'walker', 'Gentle physio to keep seniors strong and steady.', ['Single session', '5 sessions', '10 sessions'], T_PHYSIO);
  add('physiotherapy', 'postsurgphysio', 'Post-Surgery Physiotherapy', 'walker', 'Rehab after knee, hip and other surgeries.', ['Single session', '5 sessions', '10 sessions'], T_PHYSIO);
  add('physiotherapy', 'strokerehab', 'Stroke Rehabilitation', 'brain', 'Structured rehab to regain movement after a stroke.', ['Single session', '5 sessions', '10 sessions'], T_PHYSIO);
  add('equipment', 'hbed', 'Hospital Bed', 'bed', 'Manual or motorised hospital bed with mattress.', ['Rent · 1 week', 'Rent · 1 month', 'Buy'], T_EQUIP);
  add('equipment', 'wchair', 'Wheelchair', 'wheelchair', 'Foldable wheelchair for indoor and outdoor use.', ['Rent · 1 week', 'Rent · 1 month', 'Buy'], T_EQUIP);
  add('equipment', 'walkereq', 'Walker', 'walker', 'Lightweight walker for safe walking.', ['Rent · 1 month', 'Buy'], T_EQUIP);
  add('equipment', 'oxygen', 'Oxygen Concentrator', 'oxygen', '5L / 10L oxygen concentrator with setup.', ['Rent · 1 week', 'Rent · 1 month', 'Buy'], T_EQUIP);
  add('equipment', 'otherequip', 'Other Patient Care Equipment', 'sofa', 'Air mattress, commode chair, suction machine and more.', ['Rent', 'Buy'], T_EQUIP);
  add('doctors', 'consult', 'Doctor Consultation', 'steth', 'Talk to a doctor about symptoms and treatment.', ['Video call', 'Phone call'], []);
  add('doctors', 'nearby', 'Nearby Doctors', 'pin', 'Find trusted doctors near you.', ['Clinic visit'], []);
  add('doctors', 'homedoctor', 'Home Visit Doctor', 'home', 'A doctor visits the patient at home.', ['Single visit'], []);

  const services = {};
  const per = {};
  S.forEach((x) => {
    per[x.categoryId] = (per[x.categoryId] || 0) + 1;
    services[x.id] = { ...x, order: per[x.categoryId] };
  });

  return { categories, services };
}

export function demoData() {
  const N = Date.now();
  const ago = (m) => N - m * 60000;
  const day = (n) => iso(new Date(N + n * 864e5));
  const H = (...st) => st.map(([status, m, by]) => ({ status, at: ago(m), by }));

  const staff = {
    s1: { name: 'Anjali Patil', role: 'GNM Nurse', phone: '9876543210', city: 'mumbai', area: 'Andheri, Versova', skills: 'Diabetic care, injections', docs: 'verified', onDuty: true },
    s4: { name: "Joseph D'Souza", role: 'ANM Nurse', phone: '9876543213', city: 'mumbai', area: 'Bandra, Khar', skills: 'Wound dressing, IV', docs: 'verified', onDuty: false },
    s6: { name: 'Kiran Jadhav', role: 'Attendant', phone: '9876543215', city: 'pune', area: 'Kothrud', skills: 'Mobility, night shift', docs: 'pending', onDuty: false },
    s5: { name: 'Lata Pawar', role: 'GNM Nurse', phone: '9876543214', city: 'thane', area: 'Thane West', skills: 'Post-surgery, catheter', docs: 'verified', onDuty: true },
    s2: { name: 'Rahul Kadam', role: 'Physiotherapist', phone: '9876543211', city: 'mumbai', area: 'Dadar, Worli', skills: 'Post-stroke, ortho rehab', docs: 'verified', onDuty: true },
    s3: { name: 'Sushma More', role: 'Elder Caregiver', phone: '9876543212', city: 'mumbai', area: 'Borivali, Kandivali', skills: 'Bedridden care, 24-hr', docs: 'verified', onDuty: true }
  };
  Object.values(staff).forEach((s) => (s.createdAt = ago(60 * 24 * 30)));

  const meta = (id) => ({ name: `${id}.jpg`, type: 'image/jpeg', size: 6000 });
  const appl = (o, status, mins, extraHist, checks) => ({
    applied: true,
    approval: status,
    docs: status === 'approved' ? 'verified' : 'pending',
    onDuty: false,
    submittedAt: ago(mins),
    createdAt: ago(mins),
    docChecks: checks || {},
    files: {
      photo: { id: o.photo, ...meta(o.photo) },
      idProof: { id: 'fid', ...meta('fid') },
      qualification: { id: 'fcert', ...meta('fcert') },
      experience: { id: 'fexp', ...meta('fexp') }
    },
    appHistory: [{ at: ago(mins), status: 'pending', by: 'applicant', note: 'Application submitted' }].concat(extraHist || []),
    ...o
  });

  staff.app1 = appl(
    {
      photo: 'fph1',
      name: 'Rakhi Sawant',
      phone: '9811122233',
      email: 'rakhi@example.com',
      dob: '1996-08-14',
      gender: 'Female',
      city: 'mumbai',
      area: 'Andheri East',
      address: 'Room 14, Sai Krupa Chawl, Marol, Andheri East, Mumbai 400059',
      role: 'GNM Nurse',
      qualification: 'GNM Nursing, 2018',
      regNo: 'MNC-204511',
      experience: 6,
      skillList: ['Elder care', 'Diabetic care', 'Injections & IV', 'Wound dressing'],
      languages: ['Hindi', 'Marathi', 'English'],
      availability: ['Day visits', '12-hr shifts'],
      emergency: { name: 'Sunil Sawant', phone: '9811100011', relation: 'Father' }
    },
    'pending',
    95
  );

  staff.app2 = appl(
    {
      photo: 'fph2',
      name: 'Priyanka Shinde',
      phone: '9811122244',
      email: 'priyanka@example.com',
      dob: '1994-02-03',
      gender: 'Female',
      city: 'mumbai',
      area: 'Kurla West',
      address: 'Flat 6, Laxmi Niwas, Kurla West, Mumbai 400070',
      role: 'Elder Caregiver',
      qualification: 'Caregiver certificate course, 2020',
      regNo: '',
      experience: 4,
      skillList: ['Elder care', 'Bedridden care', 'Dementia support'],
      languages: ['Hindi', 'Marathi'],
      availability: ['24-hr live-in'],
      emergency: { name: 'Amit Shinde', phone: '9811100022', relation: 'Husband' },
      reviewNote: 'Your ID photo is blurry. Please upload a clearer photo of the front side.',
      reviewedAt: ago(40)
    },
    'changes',
    90,
    [{ at: ago(40), status: 'changes', by: 'admin', note: 'Your ID photo is blurry. Please upload a clearer photo of the front side.' }]
  );

  staff.app3 = appl(
    {
      photo: 'fph3',
      name: 'Deepa Nair',
      phone: '9811122255',
      email: 'deepa@example.com',
      dob: '1990-11-21',
      gender: 'Female',
      city: 'mumbai',
      area: 'Chembur',
      address: '22, Shell Colony, Chembur, Mumbai 400071',
      role: 'B.Sc Nurse',
      qualification: 'B.Sc Nursing, 2012',
      regNo: 'MNC-118820',
      experience: 11,
      skillList: ['Post-surgery care', 'Catheter care', 'Injections & IV'],
      languages: ['English', 'Hindi', 'Malayalam'],
      availability: ['Day visits', '12-hr shifts'],
      emergency: { name: 'Ravi Nair', phone: '9811100033', relation: 'Brother' },
      approvedAt: ago(30),
      reviewedAt: ago(30),
      reviewNote: ''
    },
    'approved',
    85,
    [{ at: ago(30), status: 'approved', by: 'admin', note: '' }],
    { photo: true, idProof: true, qualification: true }
  );

  Object.values(staff).forEach((s) => {
    if (s.applied) s.skills = s.skillList.join(', ');
  });

  const TN = [
    { label: 'Check BP & SpO₂', done: false },
    { label: 'Check blood sugar', done: false },
    { label: 'Give medication as prescribed', done: false },
    { label: 'Update family on visit', done: false }
  ];
  const home = 'Flat 402, Sea Breeze CHS, Lokhandwala, Andheri West';

  const bookings = {
    b1: {
      code: 'ELD-20418',
      city: 'mumbai',
      clientName: 'Priya Mehta',
      clientPhone: '9123456780',
      patientName: 'Sunita Mehta',
      patientAge: '72',
      relation: 'Mother',
      service: 'nursing',
      plan: 'Single visit',
      date: day(1),
      time: '9:00 AM',
      address: home,
      notes: 'Diabetic, on insulin. Check sugar before breakfast.',
      source: 'App',
      status: 'assigned',
      staffId: 's1',
      confirmedBy: 'staff:s1',
      confirmedAt: ago(50),
      assignedBy: 'staff:s1',
      assignedAt: ago(50),
      tasks: TN,
      history: H(['requested', 70, 'client'], ['confirmed', 50, 'staff:s1'], ['assigned', 50, 'staff:s1']),
      createdAt: ago(70)
    },
    b2: {
      code: 'ELD-19877',
      city: 'mumbai',
      clientName: 'Priya Mehta',
      clientPhone: '9123456780',
      patientName: 'Ramesh Mehta',
      patientAge: '76',
      relation: 'Father',
      service: 'physio',
      plan: 'Single visit',
      date: day(-3),
      time: '5:00 PM',
      address: home,
      notes: 'Knee replacement 6 weeks ago.',
      source: 'App',
      status: 'completed',
      staffId: 's2',
      confirmedBy: 'admin',
      assignedBy: 'admin',
      tasks: [{ label: 'Assessment', done: true }, { label: 'Guided exercises', done: true }, { label: 'Home exercise plan', done: true }],
      visit: { bp: '128/82', sugar: '', spo2: '98', note: 'Good progress on knee bend. Continue the 3 exercises twice a day. Next session in one week.' },
      checkInAt: ago(60 * 24 * 3 + 60),
      checkOutAt: ago(60 * 24 * 3),
      history: H(
        ['requested', 60 * 24 * 4, 'client'],
        ['confirmed', 60 * 24 * 4 - 30, 'admin'],
        ['assigned', 60 * 24 * 4 - 25, 'admin'],
        ['on_the_way', 60 * 24 * 3 + 80, 'staff:s2'],
        ['in_progress', 60 * 24 * 3 + 60, 'staff:s2'],
        ['completed', 60 * 24 * 3, 'staff:s2']
      ),
      createdAt: ago(60 * 24 * 4)
    },
    b12: {
      code: 'ELD-34828',
      city: 'mumbai',
      clientName: 'Priya Mehta',
      clientPhone: '9123456780',
      patientName: 'Ramesh Mehta',
      patientAge: '76',
      relation: 'Father',
      service: 'nursing',
      plan: 'Single visit',
      date: day(2),
      time: '9:00 AM',
      address: 'Flat 402, Sea Breeze CHS, Lokhandwala, Andheri West',
      notes: 'Diabetic, needs morning insulin and vitals monitoring.',
      source: 'App',
      status: 'requested',
      staffId: '',
      history: H(['requested', 12, 'client']),
      createdAt: ago(12)
    },
    b14: {
      code: 'ELD-20448',
      city: 'mumbai',
      clientName: 'Rajesh Shah',
      clientPhone: '9820123456',
      patientName: 'Kiran Shah',
      patientAge: '64',
      relation: 'Self',
      service: 'physio',
      plan: 'Single visit',
      date: day(0),
      time: '6:00 PM',
      address: 'Juhu Tara Road, Juhu',
      notes: 'Shoulder rehabilitation session.',
      source: 'App',
      status: 'requested',
      staffId: '',
      history: H(['requested', 15, 'client']),
      createdAt: ago(15)
    },
    b15: {
      code: 'ELD-20452',
      city: 'mumbai',
      clientName: 'Sunita Rao',
      clientPhone: '9820234567',
      patientName: 'Vinod Rao',
      patientAge: '81',
      relation: 'Father',
      service: 'caregiver',
      plan: '12-hr shift',
      date: day(1),
      time: '10:00 AM',
      address: 'Yari Road, Versova',
      notes: 'Assistance with daily living and hygiene.',
      source: 'Call',
      status: 'requested',
      staffId: '',
      history: H(['requested', 20, 'client']),
      createdAt: ago(20)
    },
    b4: {
      code: 'ELD-20431',
      city: 'mumbai',
      clientName: 'Kavita Desai',
      clientPhone: '9819012345',
      patientName: 'Shanta Desai',
      patientAge: '81',
      relation: 'Mother',
      service: 'attendant',
      plan: '24-hr live-in',
      date: day(1),
      time: '9:00 AM',
      address: 'B-12, Gokul Dham, Borivali East',
      notes: 'Bedridden after a fall. Needs help with hygiene and feeding.',
      source: 'WhatsApp',
      status: 'requested',
      staffId: '',
      history: H(['requested', 25, 'admin']),
      createdAt: ago(25)
    },
    b5: {
      code: 'ELD-20425',
      city: 'mumbai',
      clientName: 'Arun Nair',
      clientPhone: '9820098765',
      patientName: 'Arun Nair',
      patientAge: '58',
      relation: 'Self',
      service: 'postsurgery',
      plan: '12-hr shift',
      date: day(1),
      time: '11:00 AM',
      address: '7, Sindhi Society, Chembur',
      notes: 'Discharged after bypass surgery yesterday.',
      source: 'Call',
      status: 'confirmed',
      staffId: '',
      confirmedBy: 'admin',
      confirmedAt: ago(30),
      history: H(['requested', 40, 'admin'], ['confirmed', 30, 'admin']),
      createdAt: ago(40)
    },
    b6: {
      code: 'ELD-20402',
      city: 'mumbai',
      clientName: 'Meera Joshi',
      clientPhone: '9833011122',
      patientName: 'Vasant Joshi',
      patientAge: '79',
      relation: 'Father',
      service: 'physio',
      plan: 'Single visit',
      date: day(0),
      time: '5:00 PM',
      address: 'Shivaji Park, Dadar West',
      notes: '',
      source: 'App',
      status: 'assigned',
      staffId: 's2',
      confirmedBy: 'admin',
      assignedBy: 'admin',
      history: H(['requested', 300, 'client'], ['confirmed', 280, 'admin'], ['assigned', 280, 'admin']),
      createdAt: ago(300)
    },
    b7: {
      code: 'ELD-20436',
      city: 'mumbai',
      clientName: 'Sameer Khan',
      clientPhone: '9867055544',
      patientName: 'Zubeida Khan',
      patientAge: '67',
      relation: 'Mother',
      service: 'injection',
      plan: 'Single visit',
      date: day(0),
      time: '8:00 PM',
      address: 'Hill Road, Bandra West',
      notes: 'Insulin injection and dressing on left foot.',
      source: 'App',
      status: 'requested',
      staffId: '',
      history: H(['requested', 8, 'client']),
      createdAt: ago(8)
    },
    b8: {
      code: 'ELD-20409',
      city: 'mumbai',
      clientName: 'Farhan Shaikh',
      clientPhone: '9821077788',
      patientName: 'Farhan Shaikh',
      patientAge: '68',
      relation: 'Self',
      service: 'postsurgery',
      plan: 'Single visit',
      date: day(0),
      time: '4:00 PM',
      address: 'Shastri Nagar, Jogeshwari West',
      notes: 'Hip surgery 10 days ago. Wound dressing and walking practice.',
      source: 'Call',
      status: 'assigned',
      staffId: 's1',
      confirmedBy: 'admin',
      assignedBy: 'admin',
      tasks: [
        { label: 'Wound check & dressing', done: false },
        { label: 'Pain & vitals check', done: false },
        { label: 'Mobility exercises', done: false },
        { label: 'Medication as prescribed', done: false }
      ],
      history: H(['requested', 600, 'admin'], ['confirmed', 600, 'admin'], ['assigned', 590, 'admin']),
      createdAt: ago(600)
    },
    b9: {
      code: 'ELD-20388',
      city: 'mumbai',
      clientName: 'Vinod Rao',
      clientPhone: '9930044433',
      patientName: 'Vinod Rao',
      patientAge: '81',
      relation: 'Self',
      service: 'injection',
      plan: 'Single visit',
      date: day(0),
      time: '7:00 AM',
      address: 'Yari Road, Versova',
      notes: '',
      source: 'Call',
      status: 'completed',
      staffId: 's1',
      confirmedBy: 'admin',
      assignedBy: 'admin',
      visit: { bp: '132/86', sugar: '', spo2: '97', note: 'Injection given. Dressing changed, wound healing well.' },
      checkInAt: ago(420),
      checkOutAt: ago(380),
      history: H(
        ['requested', 900, 'admin'],
        ['confirmed', 900, 'admin'],
        ['assigned', 890, 'admin'],
        ['on_the_way', 450, 'staff:s1'],
        ['in_progress', 420, 'staff:s1'],
        ['completed', 380, 'staff:s1']
      ),
      createdAt: ago(900)
    },
    b10: {
      code: 'ELD-20429',
      city: 'thane',
      clientName: 'Rekha Kulkarni',
      clientPhone: '9821133344',
      patientName: 'Madhav Kulkarni',
      patientAge: '84',
      relation: 'Father',
      service: 'caregiver',
      plan: '12-hr shift',
      date: day(2),
      time: '9:00 AM',
      address: 'Hiranandani Estate, Thane West',
      notes: 'Dementia, needs supervision during the day.',
      source: 'App',
      status: 'requested',
      staffId: '',
      history: H(['requested', 35, 'client']),
      createdAt: ago(35)
    },
    b13: {
      code: 'ELD-20440',
      city: 'mumbai',
      clientName: 'Arun Nair',
      clientPhone: '9820098765',
      patientName: 'Arun Nair',
      patientAge: '58',
      relation: 'Self',
      service: 'hbed',
      plan: 'Rent · 1 month',
      date: day(1),
      time: '11:00 AM',
      address: '7, Sindhi Society, Chembur',
      notes: 'Motorised bed needed before discharge.',
      source: 'Call',
      status: 'confirmed',
      staffId: '',
      confirmedBy: 'admin',
      confirmedAt: ago(28),
      history: H(['requested', 30, 'admin'], ['confirmed', 28, 'admin']),
      createdAt: ago(30)
    },
    b11: {
      code: 'ELD-20377',
      city: 'pune',
      clientName: 'Sneha Kale',
      clientPhone: '9822155566',
      patientName: 'Prabha Kale',
      patientAge: '74',
      relation: 'Mother',
      service: 'nursing',
      plan: 'Single visit',
      date: day(-1),
      time: '11:00 AM',
      address: 'Karve Road, Kothrud',
      notes: '',
      source: 'WhatsApp',
      status: 'completed',
      staffId: 's6',
      confirmedBy: 'admin',
      assignedBy: 'admin',
      visit: { bp: '126/80', sugar: '118', spo2: '98', note: 'Vitals normal.' },
      checkInAt: ago(60 * 24 + 30),
      checkOutAt: ago(60 * 24),
      history: H(['requested', 60 * 26, 'admin'], ['confirmed', 60 * 26, 'admin'], ['assigned', 60 * 26, 'admin'], ['completed', 60 * 24, 'staff:s6']),
      createdAt: ago(60 * 26)
    }
  };

  const n = (to, title, body, b, m, read, extra) => ({
    to,
    title,
    body,
    bookingId: b || '',
    at: ago(m),
    read: !!read,
    ...(extra || {})
  });

  const notifications = {
    n0: n('client:9123456780', 'Request received', "We'll confirm your Elderly Care booking ELD-34828 shortly.", 'b12', 12),
    n1: n('client:9123456780', 'Caregiver assigned', 'Anjali Patil (GNM Nurse) will visit Sunita Mehta tomorrow at 9:00 AM.', 'b1', 50),
    n2: n('client:9123456780', 'Booking confirmed', 'Your Home Nursing booking ELD-20418 is confirmed for tomorrow, 9:00 AM.', 'b1', 51),
    n3: n('client:9123456780', 'Visit completed', 'Rahul Kadam completed the visit for Ramesh Mehta. Tap to see the visit report.', 'b2', 60 * 24 * 3, true),
    n4: n('staff:s1', 'New visit assigned', 'Farhan Shaikh · Post-Surgery Care · Today, 4:00 PM · Shastri Nagar, Jogeshwari West', 'b8', 590),
    n5: n('staff:s1', 'New booking request ELD-20436', 'Injection Support for Zubeida Khan, 67 · Today, 8:00 PM · Hill Road, Bandra West', 'b7', 8),
    n5b: n('staff:s1', 'New booking request ELD-34828', 'Elderly Care for Ramesh Mehta, 76 · 12-hr shift · Lokhandwala, Andheri West', 'b12', 12),
    n6: n('staff:s1', 'New booking request ELD-20431', '24-Hour Care for Shanta Desai, 81 · Tomorrow, 9:00 AM · B-12, Gokul Dham, Borivali East', 'b4', 25, true),
    n7: n('admin', 'New request ELD-20436', 'Sameer Khan booked Injection Support for Zubeida Khan in Mumbai · Today, 8:00 PM', 'b7', 8),
    n7b: n('admin', 'New request ELD-34828', 'Priya Mehta booked Elderly Care for Ramesh Mehta in Mumbai', 'b12', 12),
    n8: n('admin', 'ELD-20418 accepted by staff', "Anjali Patil took Sunita Mehta's Home Nursing visit in Mumbai · Tomorrow, 9:00 AM.", 'b1', 50),
    n9: n('admin', 'New staff application: Neha Sawant', 'GNM Nurse · Mumbai · 6 yrs experience. Review the documents in Onboarding.', '', 95, false, { appId: 'app1' }),
    n10: n('admin', 'New staff application: Priyanka Shinde', 'Elder Caregiver · Mumbai · 4 yrs experience. Review the documents in Onboarding.', '', 90, true, { appId: 'app2' }),
    n11: n('admin', 'New staff application: Deepa Nair', 'B.Sc Nurse · Mumbai · 11 yrs experience. Review the documents in Onboarding.', '', 85, true, { appId: 'app3' }),
    n12: n('admin', 'Visit completed ELD-20388', "Anjali Patil checked out from Vinod Rao's visit.", 'b9', 380, true)
  };

  const enquiries = {
    q1: {
      code: 'HLP-40213',
      clientName: 'Priya Mehta',
      clientPhone: '9123456780',
      city: 'mumbai',
      area: 'Andheri West',
      address: 'Flat 402, Sea Breeze CHS, Lokhandwala, Andheri West',
      description:
        'My father had a mild stroke last month. He can walk with support but needs help with bathing and exercises. Not sure if we need a nurse, a caregiver or physiotherapy.',
      patientType: 'Stroke / paralysis',
      patientAge: '76',
      duration: '1 month or more',
      timing: 'Daytime',
      files: [{ id: 'fexp', name: 'discharge-summary.jpg', type: 'image/jpeg', size: 12000 }],
      status: 'new',
      history: [{ status: 'new', at: ago(25), by: 'client' }],
      createdAt: ago(25)
    },
    q2: {
      code: 'HLP-40198',
      clientName: 'Kavita Desai',
      clientPhone: '9819012345',
      city: 'mumbai',
      area: 'Borivali East',
      address: 'B-12, Gokul Dham, Borivali East',
      description:
        'Mother is bedridden after a fall. We need someone to stay with her and also want to know about a hospital bed.',
      patientType: 'Bedridden patient',
      patientAge: '81',
      duration: '1 month or more',
      timing: '24-hr live-in',
      files: [],
      status: 'contacted',
      recommended: 'care-bedridden',
      adminNote: 'Spoke to Kavita. Suggested 24-hr caregiver.',
      history: [
        { status: 'new', at: ago(120), by: 'client' },
        { status: 'contacted', at: ago(45), by: 'admin', note: 'Called client' }
      ],
      createdAt: ago(120)
    }
  };

  const { categories, services } = starterCatalog();
  const cities = {
    mumbai: { name: 'Mumbai', order: 1, phone: '9820012345', whatsapp: '9820012345' },
    pune: { name: 'Pune', order: 4, phone: '9822012345', whatsapp: '9822012345' }
  };

  const withIds = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, id: k }]));

  return {
    categories: withIds(categories),
    enquiries: withIds(enquiries),
    bookings: withIds(bookings),
    staff: withIds(staff),
    notifications: withIds(notifications),
    services: withIds(services),
    cities: withIds(cities),
    settings: {
      app: { id: 'app', phone: '9820012345', whatsapp: '9820012345', staffCanConfirm: true }
    }
  };
}
