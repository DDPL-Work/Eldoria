require('dotenv').config();
const { sequelize, Service } = require('../database/models');
const { generateServiceCode } = require('../helpers/generateServiceID');

/**
 * Seed initial catalog services matching Eldoria starterCatalog
 * Run standalone: `node src/Seed/service.seed.js`
 */
const seedServices = async () => {
  try {
    await sequelize.authenticate();

    const count = await Service.count();
    if (count > 0) {
      console.log(`ℹ️ Services already seeded (count: ${count}).`);
      return;
    }

    console.log('Seeding initial catalog services...');

    const CARE_OPTS = ['Single visit', '12-hr shift', '24-hr live-in'];
    const VISIT_OPTS = ['Single visit', 'Daily visits'];
    const T_ELDER = ['Personal hygiene', 'Meals & hydration', 'Assisted walk', 'Medication reminder'];
    const T_NURSE = ['Check BP & SpO₂', 'Check blood sugar', 'Give medication as prescribed', 'Update family on visit'];
    const T_PHYSIO = ['Assessment', 'Guided exercises', 'Home exercise plan'];
    const T_EQUIP = ['Deliver & install', 'Demo to family', 'Safety check'];

    const cats = [
      { key: 'elder', name: 'Elder Care', desc: 'Daily care, company and supervision for senior citizens.', icon: 'heart', kind: 'care', order: 1 },
      { key: 'nursingcare', name: 'Home Nursing', desc: 'Qualified nurses for clinical care at home.', icon: 'cross', kind: 'care', order: 2 },
      { key: 'caregivers', name: 'Caregiver & Patient Attendant', desc: 'Trained caregivers and attendants, by shift or live-in.', icon: 'users', kind: 'care', order: 3 },
      { key: 'special', name: 'Specialized Patient Care', desc: 'Long-term and condition-specific care at home.', icon: 'shield', kind: 'care', order: 4 },
      { key: 'babycare', name: 'Baby Care', desc: 'Newborn care, baby sitting and support for new mothers.', icon: 'baby', kind: 'care', order: 5 },
      { key: 'physiotherapy', name: 'Physiotherapy', desc: 'Home physiotherapy and rehabilitation sessions.', icon: 'walker', kind: 'care', order: 6 },
      { key: 'equipment', name: 'Medical Equipment', desc: 'Hospital beds, wheelchairs, oxygen and more on rent or sale.', icon: 'wheelchair', kind: 'equipment', order: 7 },
      { key: 'doctors', name: 'Doctor Services', desc: 'Doctor consultations and home visits.', icon: 'steth', kind: 'doctor', order: 8, comingSoon: true }
    ];

    const rawList = [
      // Elder Care
      { cat: 'elder', slug: 'senior', name: 'Senior Citizen Care', icon: 'heart', desc: 'All-round daily support for senior citizens at home.', opts: CARE_OPTS, tasks: T_ELDER, price: 0, unit: 'per visit' },
      { cat: 'elder', slug: 'caregiver', name: 'Elderly Care', icon: 'heart', desc: 'Daily living support: bathing, feeding, mobility and company.', opts: CARE_OPTS, tasks: T_ELDER, price: 1500, unit: 'per shift' },
      { cat: 'elder', slug: 'companion', name: 'Companionship & Supervision', icon: 'users', desc: 'Friendly company, conversation and safety supervision.', opts: CARE_OPTS, tasks: ['Conversation & activities', 'Safety supervision', 'Walk outdoors', 'Update family'], price: 0, unit: 'per visit' },
      { cat: 'elder', slug: 'dementia', name: 'Dementia Care', icon: 'brain', desc: 'Patient, trained care for memory loss and confusion.', opts: CARE_OPTS, tasks: ['Routine & reminders', 'Safety supervision', 'Meals & hygiene', 'Calming activities'], price: 0, unit: 'per visit' },
      { cat: 'elder', slug: 'bedridden', name: 'Bedridden Patient Care', icon: 'bed', desc: 'Hygiene, position changes and bed-sore prevention.', opts: CARE_OPTS, tasks: ['Sponge bath & hygiene', 'Turn every 2 hours', 'Feeding', 'Bed-sore check'], price: 0, unit: 'per visit' },
      { cat: 'elder', slug: 'posthosp', name: 'Post-Hospitalization Care', icon: 'home', desc: 'Recovery support in the first weeks after discharge.', opts: CARE_OPTS, tasks: T_NURSE, price: 0, unit: 'per visit' },
      { cat: 'elder', slug: 'daycare', name: 'Day Care', icon: 'sun', desc: 'Daytime care while the family is at work.', opts: ['Day care (8 hrs)', 'Day care (10 hrs)'], tasks: T_ELDER, price: 0, unit: 'per visit' },
      { cat: 'elder', slug: 'nightcare', name: 'Night Care', icon: 'moon', desc: 'Overnight care and monitoring so the family can rest.', opts: ['Night shift (12 hrs)'], tasks: ['Night monitoring', 'Toilet assistance', 'Medication on time', 'Morning handover'], price: 0, unit: 'per shift' },

      // Home Nursing
      { cat: 'nursingcare', slug: 'nursing', name: 'Home Nursing', icon: 'cross', desc: 'Qualified GNM/ANM nurse for vitals, medication and clinical care.', opts: CARE_OPTS, tasks: T_NURSE, price: 1200, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'generalnursing', name: 'General Nursing Care', icon: 'cross', desc: 'Routine nursing care for patients recovering at home.', opts: CARE_OPTS, tasks: T_NURSE, price: 0, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'icu', name: 'ICU Care at Home', icon: 'monitor', desc: 'Critical-care trained nurses with equipment support.', opts: ['12-hr shift', '24-hr live-in'], tasks: ['Monitor vitals & machines', 'Suctioning as needed', 'Medication & IV', 'Hourly chart'], price: 0, unit: 'per shift' },
      { cat: 'nursingcare', slug: 'medication', name: 'Medication Support', icon: 'pill', desc: 'Correct medicines at the correct time, every day.', opts: VISIT_OPTS, tasks: ['Check prescription', 'Give medicines', 'Record in chart'], price: 0, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'injection', name: 'Injection Support', icon: 'syringe', desc: 'IM/IV/subcutaneous injections given by a nurse.', opts: VISIT_OPTS, tasks: ['Verify prescription', 'Give injection', 'Dispose waste safely'], price: 500, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'wound', name: 'Wound Dressing', icon: 'bandage', desc: 'Sterile wound and surgical dressing at home.', opts: VISIT_OPTS, tasks: ['Clean wound', 'Change dressing', 'Check for infection'], price: 0, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'catheter', name: 'Catheter Care', icon: 'droplet', desc: 'Catheter insertion, change and care.', opts: VISIT_OPTS, tasks: ['Catheter hygiene', 'Change bag', 'Check for infection'], price: 0, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'ryles', name: 'Ryles Tube Care', icon: 'tube', desc: 'Ryles tube insertion, feeding and care.', opts: VISIT_OPTS, tasks: ['Check tube position', 'Tube feeding', 'Clean & secure tube'], price: 0, unit: 'per visit' },
      { cat: 'nursingcare', slug: 'vitals', name: 'Vital Monitoring', icon: 'pulse', desc: 'Regular BP, sugar, SpO₂ and temperature checks.', opts: VISIT_OPTS, tasks: ['BP & pulse', 'Blood sugar', 'SpO₂ & temperature', 'Share report'], price: 0, unit: 'per visit' },

      // Caregivers
      { cat: 'caregivers', slug: 'patientcg', name: 'Patient Caregiver', icon: 'users', desc: 'Trained caregiver for patients recovering at home.', opts: CARE_OPTS, tasks: T_ELDER, price: 0, unit: 'per visit' },
      { cat: 'caregivers', slug: 'eldercg', name: 'Elder Caregiver', icon: 'heart', desc: 'Caregiver for elderly parents and grandparents.', opts: CARE_OPTS, tasks: T_ELDER, price: 0, unit: 'per visit' },
      { cat: 'caregivers', slug: 'malecg', name: 'Male Caregiver', icon: 'male', desc: 'Male caregiver, helpful for lifting and male patients.', opts: CARE_OPTS, tasks: T_ELDER, price: 0, unit: 'per visit' },
      { cat: 'caregivers', slug: 'femalecg', name: 'Female Caregiver', icon: 'female', desc: 'Female caregiver for women and elderly patients.', opts: CARE_OPTS, tasks: T_ELDER, price: 0, unit: 'per visit' },
      { cat: 'caregivers', slug: 'care12', name: '12-Hour Care', icon: 'clock', desc: 'Day or night caregiver for a 12-hour shift.', opts: ['12-hr day shift', '12-hr night shift'], tasks: T_ELDER, price: 0, unit: 'per shift' },
      { cat: 'caregivers', slug: 'attendant', name: '24-Hour Care', icon: 'clock', desc: 'Round-the-clock care with a caregiver on duty.', opts: ['24-hr live-in'], tasks: ['Shift handover', 'Hygiene & meals', 'Night monitoring'], price: 2200, unit: 'per day' },
      { cat: 'caregivers', slug: 'livein', name: 'Live-in Caregiver', icon: 'home', desc: 'Caregiver who stays at home, by week or month.', opts: ['1 week', '1 month'], tasks: T_ELDER, price: 0, unit: 'per month' },

      // Specialized
      { cat: 'special', slug: 'stroke', name: 'Stroke Patient Care', icon: 'brain', desc: 'Care and daily rehab support after a stroke.', opts: CARE_OPTS, tasks: ['Positioning & mobility', 'Feeding support', 'Exercises as advised', 'Vitals check'], price: 0, unit: 'per visit' },
      { cat: 'special', slug: 'paralysis', name: 'Paralysis Care', icon: 'bed', desc: 'Care for patients with partial or full paralysis.', opts: CARE_OPTS, tasks: ['Turn & position', 'Hygiene', 'Passive exercises', 'Bed-sore check'], price: 0, unit: 'per visit' },
      { cat: 'special', slug: 'postsurgery', name: 'Post-Surgery Care', icon: 'bed', desc: 'Recovery care after hospital discharge, wound and mobility care.', opts: CARE_OPTS, tasks: ['Wound check & dressing', 'Pain & vitals check', 'Mobility exercises', 'Medication as prescribed'], price: 1800, unit: 'per visit' },
      { cat: 'special', slug: 'cancer', name: 'Cancer Patient Care', icon: 'ribbon', desc: 'Gentle care during treatment and recovery.', opts: CARE_OPTS, tasks: ['Medication on time', 'Nutrition support', 'Comfort care', 'Vitals check'], price: 0, unit: 'per visit' },
      { cat: 'special', slug: 'palliative', name: 'Palliative Care', icon: 'hand', desc: 'Comfort-focused care for serious illness.', opts: CARE_OPTS, tasks: ['Pain & comfort care', 'Hygiene', 'Emotional support', 'Family updates'], price: 0, unit: 'per visit' },
      { cat: 'special', slug: 'parkinsons', name: 'Parkinson’s Care', icon: 'pulse', desc: 'Support with movement, routines and medication.', opts: CARE_OPTS, tasks: ['Medication on time', 'Assisted walk', 'Fall prevention', 'Exercises'], price: 0, unit: 'per visit' },
      { cat: 'special', slug: 'alzheimers', name: 'Alzheimer’s / Dementia Care', icon: 'brain', desc: 'Specialised memory care with a safe routine.', opts: CARE_OPTS, tasks: ['Routine & reminders', 'Safety supervision', 'Meals & hygiene', 'Calming activities'], price: 0, unit: 'per visit' },

      // Baby Care
      { cat: 'babycare', slug: 'newborn', name: 'Newborn Baby Care', icon: 'baby', desc: 'Trained nanny for newborn feeding, bathing and sleep.', opts: ['12-hr shift', '24-hr live-in'], tasks: ['Bathing & massage', 'Feeding support', 'Sleep routine', 'Hygiene'], price: 0, unit: 'per shift' },
      { cat: 'babycare', slug: 'babysitter', name: 'Baby Sitter', icon: 'baby', desc: 'Safe, caring baby sitter at home.', opts: ['4-hr visit', '8-hr shift', '12-hr shift'], tasks: ['Play & feeding', 'Nap time', 'Hygiene'], price: 0, unit: 'per shift' },
      { cat: 'babycare', slug: 'motherbaby', name: 'Mother & Baby Support', icon: 'heart', desc: 'Care for the new mother and baby after delivery.', opts: ['12-hr shift', '24-hr live-in'], tasks: ['Mother care & diet', 'Baby bath & massage', 'Feeding support'], price: 0, unit: 'per shift' },

      // Physiotherapy
      { cat: 'physiotherapy', slug: 'physio', name: 'Home Physiotherapy', icon: 'walker', desc: 'Home physio sessions for pain, injury and mobility.', opts: ['Single session', '5 sessions', '10 sessions'], tasks: T_PHYSIO, price: 900, unit: 'per session' },
      { cat: 'physiotherapy', slug: 'elderphysio', name: 'Elderly Physiotherapy', icon: 'walker', desc: 'Gentle physio to keep seniors strong and steady.', opts: ['Single session', '5 sessions', '10 sessions'], tasks: T_PHYSIO, price: 0, unit: 'per session' },
      { cat: 'physiotherapy', slug: 'postsurgphysio', name: 'Post-Surgery Physiotherapy', icon: 'walker', desc: 'Rehab after knee, hip and other surgeries.', opts: ['Single session', '5 sessions', '10 sessions'], tasks: T_PHYSIO, price: 0, unit: 'per session' },
      { cat: 'physiotherapy', slug: 'strokerehab', name: 'Stroke Rehabilitation', icon: 'brain', desc: 'Structured rehab to regain movement after a stroke.', opts: ['Single session', '5 sessions', '10 sessions'], tasks: T_PHYSIO, price: 0, unit: 'per session' },

      // Equipment
      { cat: 'equipment', slug: 'hbed', name: 'Hospital Bed', icon: 'bed', desc: 'Manual or motorised hospital bed with mattress.', opts: ['Rent · 1 week', 'Rent · 1 month', 'Buy'], tasks: T_EQUIP, price: 0, unit: 'one-time' },
      { cat: 'equipment', slug: 'wchair', name: 'Wheelchair', icon: 'wheelchair', desc: 'Foldable wheelchair for indoor and outdoor use.', opts: ['Rent · 1 week', 'Rent · 1 month', 'Buy'], tasks: T_EQUIP, price: 0, unit: 'one-time' },
      { cat: 'equipment', slug: 'walkereq', name: 'Walker', icon: 'walker', desc: 'Lightweight walker for safe walking.', opts: ['Rent · 1 month', 'Buy'], tasks: T_EQUIP, price: 0, unit: 'one-time' },
      { cat: 'equipment', slug: 'oxygen', name: 'Oxygen Concentrator', icon: 'oxygen', desc: '5L / 10L oxygen concentrator with setup.', opts: ['Rent · 1 week', 'Rent · 1 month', 'Buy'], tasks: T_EQUIP, price: 0, unit: 'one-time' },
      { cat: 'equipment', slug: 'otherequip', name: 'Other Patient Care Equipment', icon: 'sofa', desc: 'Air mattress, commode chair, suction machine and more.', opts: ['Rent', 'Buy'], tasks: T_EQUIP, price: 0, unit: 'one-time' },

      // Doctor Services (Coming Soon)
      { cat: 'doctors', slug: 'consult', name: 'Doctor Consultation', icon: 'steth', desc: 'Talk to a doctor about symptoms and treatment.', opts: ['Video call', 'Phone call'], tasks: [], price: 0, unit: 'per session' },
      { cat: 'doctors', slug: 'nearby', name: 'Nearby Doctors', icon: 'pin', desc: 'Find trusted doctors near you.', opts: ['Clinic visit'], tasks: [], price: 0, unit: 'per visit' },
      { cat: 'doctors', slug: 'homedoctor', name: 'Home Visit Doctor', icon: 'home', desc: 'A doctor visits the patient at home.', opts: ['Single visit'], tasks: [], price: 0, unit: 'per visit' }
    ];

    const catMap = Object.fromEntries(cats.map(c => [c.key, c]));
    const catOrders = {};

    for (const item of rawList) {
      const cMeta = catMap[item.cat] || { name: item.cat, icon: 'cross', kind: 'care', order: 99 };
      catOrders[item.cat] = (catOrders[item.cat] || 0) + 1;

      const code = await generateServiceCode(cMeta.name, cMeta.kind, new Date());

      await Service.create({
        code,
        serviceId: item.slug,
        name: item.name,
        category: item.cat,
        categoryName: cMeta.name,
        categoryIcon: cMeta.icon,
        categoryDesc: cMeta.desc,
        categoryOrder: cMeta.order,
        type: cMeta.kind || 'care',
        desc: item.desc,
        icon: item.icon,
        image: null,
        priceMode: item.price > 0 ? 'fixed' : 'contact',
        price: item.price,
        unit: item.unit,
        options: item.opts,
        tasks: item.tasks,
        enabled: true,
        comingSoon: Boolean(cMeta.comingSoon),
        order: catOrders[item.cat]
      });
    }

    console.log(`✅ Seeded ${rawList.length} initial services.`);
  } catch (error) {
    console.error('❌ Failed to seed services:', error.message);
  } finally {
    if (require.main === module) {
      await sequelize.close();
      process.exit(0);
    }
  }
};

if (require.main === module) {
  seedServices();
}

module.exports = seedServices;
