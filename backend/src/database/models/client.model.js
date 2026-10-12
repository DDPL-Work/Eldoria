const { DataTypes } = require('sequelize');

/**
 * Client Profile Model
 * Stores domain-specific care seeker and patient data (extracted from Eldoria Client app flow)
 * Common identity fields (name, email, phone, role, isActive) are stored in the unified User model
 */
module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    clientId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },

    // 1. Geographic & Location Details
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'mumbai'
    },
    area: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pincode: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    landmark: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    // 2. Primary Patient / Care Receiver Details (from index.html booking & help flows)
    patientName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    patientAge: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    patientGender: {
      type: DataTypes.ENUM('male', 'female', 'others'),
      allowNull: true
    },
    relation: {
      type: DataTypes.ENUM(
        'Mother',
        'Father',
        'Self',
        'Spouse',
        'Grandparent',
        'Other'
      ),
      allowNull: true,
      defaultValue: 'Mother'
    },
    patientType: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: "e.g. Elderly parent, Bedridden patient, Stroke / paralysis, Dementia / memory loss, etc."
    },

    // 3. Care & Medical Requirements (from index.html assessment / help form)
    medicalConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "e.g. Diabetic on insulin, post-stroke recovery, mobility notes"
    },
    mobilityStatus: {
      type: DataTypes.ENUM('independent', 'walks_with_support', 'wheelchair_bound', 'bedridden'),
      allowNull: true
    },
    requiredService: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: "Primary care service e.g. Elder Caregiver, GNM Nurse, ICU Care, Physiotherapist"
    },
    preferredPlan: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "e.g. Single visit, 12-hr shift, 24-hr live-in"
    },
    preferredTiming: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Morning, Afternoon, Evening, Night, Daytime, 24 hours, Flexible"
    },
    expectedDuration: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "One visit, A few days, 1–2 weeks, 1 month or more, Not sure yet"
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Special requests, language preferences, caregiver gender preference"
    },

    // 4. Emergency / Alternate Contact
    emergencyName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    emergencyPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    emergencyRelation: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    // 5. Medical Documents & Prescriptions
    files: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Uploaded medical files, prescriptions, discharge summaries"
    },

    // 6. Source & Administrative Metadata
    source: {
      type: DataTypes.ENUM('Call', 'WhatsApp', 'App', 'Walk-in', 'Website', 'Referral'),
      defaultValue: 'App',
      allowNull: false
    },
    preferredLanguage: {
      type: DataTypes.STRING(50),
      defaultValue: 'English',
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'archived'),
      defaultValue: 'active',
      allowNull: false
    }
  }, {
    tableName: 'clients',
    timestamps: true
  });

  return Client;
};
