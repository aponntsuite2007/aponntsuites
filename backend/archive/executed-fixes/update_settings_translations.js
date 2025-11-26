const fs = require('fs');
const path = require('path');

const localesDir = 'C:\\Bio\\sistema_asistencia_biometrico\\backend\\public\\locales';

// Translation content for English (will be inserted in en.json)
const enSettings = `    "settings": {
      "title": "Settings",
      "description": "System configuration",
      "server": {
        "title": "📡 Server Configuration for APK",
        "subtitle": "Use this information to manually configure the Flutter APK",
        "ip_label": "SERVER IP ADDRESS:",
        "port_label": "PORT:",
        "full_url_label": "FULL URL:",
        "loading": "Loading...",
        "copy_button": "📋 Copy",
        "copy_url_button": "📋 Copy URL",
        "apk_config_title": "📱 To configure the APK:",
        "apk_step1": "1. Open APK → Settings",
        "apk_step2": "2. Enter IP:",
        "apk_step3": "3. Enter Port:",
        "apk_step4": "4. Save and use"
      },
      "company": {
        "title": "🏢 Company Data",
        "name_label": "Company Name:",
        "name_placeholder": "Company name",
        "timezone_label": "Time Zone:",
        "timezone_argentina": "Argentina/Buenos Aires",
        "timezone_mexico": "Mexico/Mexico City",
        "timezone_colombia": "Colombia/Bogotá",
        "timezone_peru": "Peru/Lima",
        "timezone_chile": "Chile/Santiago",
        "save_button": "💾 Save Configuration"
      },
      "biometric": {
        "title": "🔐 Biometric Configuration",
        "fingerprint_label": "Fingerprint Recognition",
        "face_recognition_label": "Face Recognition",
        "max_fingerprints_label": "Maximum Fingerprints per User:",
        "save_button": "💾 Save Biometric"
      },
      "communications": {
        "title": "📧 Communications Configuration",
        "email_section": "📧 Email",
        "email_notifications_label": "Email Notifications",
        "smtp_server_label": "SMTP Server:",
        "smtp_server_placeholder": "smtp.gmail.com",
        "system_email_label": "System Email:",
        "system_email_placeholder": "system@aponnt.com",
        "save_notifications_button": "💾 Save Notifications",
        "test_email_button": "📧 Test Email",
        "whatsapp_section": "📱 WhatsApp Business",
        "whatsapp_enabled_label": "WhatsApp Enabled",
        "whatsapp_token_label": "WhatsApp Business Token:",
        "whatsapp_token_placeholder": "API Token",
        "whatsapp_number_label": "WhatsApp Number:",
        "whatsapp_number_placeholder": "+54 2657 673741",
        "save_whatsapp_button": "💾 Save WhatsApp",
        "test_whatsapp_button": "📱 Test WhatsApp"
      },
      "medical": {
        "title": "🏥 General Medical Configuration",
        "module_enabled_label": "Medical Module Enabled",
        "max_certificate_days_label": "Maximum days for certificates:",
        "requires_audit_label": "Requires medical audit:",
        "requires_audit_always": "Always",
        "requires_audit_over_days": "Only over X days",
        "requires_audit_never": "Never",
        "audit_days_limit_label": "Days limit for audit:",
        "save_button": "💾 Save Medical Configuration"
      },
      "questionnaires": {
        "title": "📋 Medical Questionnaires",
        "create_button": "➕ Create Questionnaire",
        "covid_title": "COVID-19 Questionnaire",
        "symptoms_title": "General Symptoms Assessment",
        "status_active": "Active",
        "edit_button": "✏️ Edit"
      },
      "art": {
        "title": "🚨 Multiple ART Configuration",
        "notifications_enabled_label": "ART Notifications Enabled",
        "providers_title": "Configured ART Providers",
        "add_button": "➕ Add ART",
        "no_providers": "No ART providers configured. Click \\"Add ART\\" to start.",
        "global_channel_label": "Global notification channel:",
        "channel_email": "Email",
        "channel_sms": "SMS",
        "channel_whatsapp": "WhatsApp",
        "channel_all": "All channels",
        "save_button": "💾 Save Configuration",
        "test_all_button": "🚨 Test All ARTs",
        "modal": {
          "title": "🚨 Add ART Provider",
          "name_label": "ART Provider Name:",
          "name_placeholder": "Ex: Galeno ART",
          "client_code_label": "Client Code/Number:",
          "client_code_placeholder": "Client No.",
          "email_label": "Notification Email:",
          "email_placeholder": "notifications@art.com",
          "phone_label": "Phone:",
          "phone_placeholder": "+54 11 1234-5678",
          "preferred_channel_label": "Preferred Channel:",
          "priority_label": "Priority:",
          "priority_primary": "Primary",
          "priority_secondary": "Secondary",
          "priority_backup": "Backup",
          "emergency_contact_label": "Emergency Contact:",
          "emergency_contact_placeholder": "Dr. John Smith",
          "schedule_label": "Service Hours:",
          "schedule_placeholder": "Mon-Fri: 8AM-6PM, Emergencies 24h",
          "cancel_button": "Cancel",
          "add_button": "Add ART"
        },
        "card": {
          "client_label": "Client:",
          "channel_label": "Channel:",
          "no_phone": "No phone",
          "contact_label": "Contact:",
          "edit_button": "✏️",
          "delete_button": "🗑️"
        }
      },
      "licenses": {
        "title": "🏖️ Leaves and Vacation Policy",
        "vacation_config_title": "Vacation Configuration",
        "calculator_button": "🧮 Calculator",
        "vacation_scale_title": "📅 Vacation Days by Seniority",
        "seniority_label": "Seniority",
        "days_label": "Days",
        "action_label": "Action",
        "seniority_0_5": "6 months - 5 years",
        "seniority_5_10": "5 - 10 years",
        "seniority_10_20": "10 - 20 years",
        "seniority_20_plus": "Over 20 years",
        "update_button": "✓",
        "add_scale_button": "➕ Add Scale",
        "extraordinary_title": "🚨 Extraordinary Leaves",
        "family_death_label": "Family bereavement:",
        "marriage_label": "Marriage:",
        "paternity_label": "Paternity:",
        "medical_exam_label": "Medical exam:",
        "days_unit": "days",
        "day_unit": "day",
        "day_type_habil": "Working days",
        "day_type_corrido": "Calendar days",
        "add_type_button": "➕ Add Type",
        "calculation_title": "⚖️ Calculation Configuration",
        "interruptible_label": "Vacations can be interrupted by illness",
        "min_continuous_label": "Minimum continuous vacation period:",
        "max_fractions_label": "Maximum fractionation period:",
        "fractions_unit": "parts",
        "auto_scheduling_label": "Automatic scheduling by task compatibility",
        "min_advance_label": "Minimum advance notice:",
        "max_simultaneous_label": "Maximum simultaneous employees on vacation:",
        "team_percent": "% of team",
        "save_config_button": "💾 Save Leave Configuration",
        "generate_schedule_button": "📋 Generate Automatic Schedule",
        "compatibility_matrix_button": "🔄 View Compatibility Matrix",
        "modal_vacation_scale": {
          "title": "📅 Add Vacation Scale",
          "range_label": "Seniority Range:",
          "range_placeholder": "Ex: 25-30 years",
          "days_label": "Vacation Days:",
          "cancel_button": "Cancel",
          "add_button": "Add"
        },
        "modal_extraordinary": {
          "title": "🚨 Add Extraordinary Leave",
          "type_label": "Leave Type:",
          "type_placeholder": "Ex: Moving",
          "days_label": "Days:",
          "day_type_label": "Day Type:",
          "cancel_button": "Cancel",
          "add_button": "Add"
        },
        "modal_schedule": {
          "title": "📋 Automatic Vacation Schedule",
          "algorithm_title": "🔍 Objective Scheduling Algorithm",
          "algorithm_desc": "The system has analyzed each employee's tasks and generated a schedule that ensures coverage of all critical activities during vacation periods.",
          "employee_col": "Employee",
          "period_col": "Suggested Period",
          "days_col": "Days",
          "status_col": "Status",
          "status_optimal": "✅ Optimal",
          "status_review": "⚠️ Review",
          "accept_button": "✅ Accept Schedule",
          "modify_button": "✏️ Allow HR Modifications",
          "close_button": "Close"
        },
        "modal_compatibility": {
          "title": "🔄 Task Compatibility Matrix",
          "employee_col": "Employee",
          "main_tasks_col": "Main Tasks",
          "can_cover_col": "Can Cover",
          "compatibility_col": "Compatibility",
          "close_button": "Close"
        }
      },
      "barcode": {
        "title": "📱 QR Code Configuration",
        "enabled_label": "Allow barcode clock-in",
        "format_label": "Code format:",
        "format_employee_id": "Employee ID",
        "format_custom": "Custom code",
        "format_qr_json": "QR Code with JSON data",
        "prefix_label": "Code prefix (optional):",
        "prefix_placeholder": "EMP-",
        "save_button": "💾 Save Configuration",
        "generate_button": "📊 Generate Codes",
        "test_button": "📱 Test Scanner",
        "preview_title": "📊 Generated Codes"
      },
      "alerts": {
        "title": "⚠️ Out-of-Shift Alert System",
        "enabled_label": "Enable alerts for out-of-shift clock-in",
        "admins_label": "Administrators to notify:",
        "admin_primary_label": "Primary Admin - SMS:",
        "admin_secondary_label": "Secondary Admin - Email:",
        "whatsapp_label": "WhatsApp:",
        "save_button": "💾 Save Alerts",
        "test_button": "⚠️ Test Alert"
      },
      "messages": {
        "copied": "✅ Copied: {{text}}",
        "copy_error": "❌ Error copying to clipboard",
        "config_loaded": "⚙️ Current configuration loaded",
        "enter_company_name": "⚠️ Please enter company name",
        "saving_company": "🔄 Saving company configuration...",
        "company_saved": "✅ Company configuration saved successfully",
        "saving_biometric": "🔄 Saving biometric configuration...",
        "biometric_saved": "✅ Biometric configuration saved successfully",
        "saving_notifications": "🔄 Saving notification configuration...",
        "notifications_saved": "✅ Notification configuration saved",
        "enter_email": "❌ Please enter system email",
        "sending_test_email": "📧 Sending test email...",
        "test_email_sent": "✅ Test email sent successfully",
        "saving_whatsapp": "🔄 Saving WhatsApp configuration...",
        "whatsapp_saved": "✅ WhatsApp configuration saved",
        "enter_whatsapp_number": "❌ Please enter WhatsApp number",
        "sending_test_whatsapp": "📱 Sending test WhatsApp message...",
        "test_whatsapp_sent": "✅ WhatsApp message sent successfully",
        "saving_medical": "🔄 Saving medical configuration...",
        "medical_saved": "✅ Medical configuration saved successfully",
        "questionnaire_in_dev": "📋 Create questionnaire function in development",
        "edit_questionnaire_in_dev": "✏️ Edit questionnaire function in development",
        "saving_art": "🔄 Saving ART configuration...",
        "art_saved": "✅ ART configuration saved successfully",
        "sending_test_art": "🚨 Sending test notification to ART...",
        "test_art_sent": "✅ ART notification sent successfully",
        "art_provider_added": "✅ ART provider added successfully",
        "edit_art_in_dev": "✏️ Edit ART function in development",
        "art_provider_deleted": "🗑️ ART provider deleted",
        "confirm_delete_art": "Are you sure you want to delete this ART provider?",
        "saving_multiple_art": "🔄 Saving multiple ART configuration...",
        "multiple_art_saved": "✅ ART configuration saved ({{count}} providers)",
        "no_art_providers": "⚠️ No ART providers configured",
        "testing_all_art": "🚨 Sending test notification to {{count}} ART providers...",
        "all_art_tested": "✅ Notifications sent to all ARTs",
        "vacation_scale_updated": "✅ Vacation scale updated",
        "vacation_scale_added": "✅ New vacation scale added",
        "extraordinary_license_added": "✅ New extraordinary leave added",
        "saving_licenses": "🔄 Saving leave configuration...",
        "licenses_saved": "✅ Leave configuration saved successfully",
        "generating_schedule": "📋 Generating automatic vacation schedule...",
        "schedule_generated": "✅ Automatic schedule generated based on task compatibility",
        "schedule_accepted": "✅ Vacation schedule accepted and applied",
        "schedule_modifications_enabled": "✏️ Schedule enabled for HR modifications",
        "showing_compatibility": "🔄 Showing task compatibility matrix...",
        "calculator_opening": "🧮 Opening vacation calculator...",
        "saving_barcode": "🔄 Saving code configuration...",
        "barcode_saved": "✅ Code configuration saved",
        "generating_barcodes": "📊 Generating codes for all employees...",
        "barcodes_generated": "✅ Codes generated successfully",
        "test_scanner_in_dev": "📱 Test scanner function in development",
        "saving_alerts": "🔄 Saving alert configuration...",
        "alerts_saved": "✅ Alert configuration saved",
        "testing_alert": "⚠️ Simulating out-of-shift clock-in...",
        "test_alert_sent": "✅ Test alert sent to administrators",
        "error_saving": "❌ Error saving configuration: {{message}}",
        "error_loading_server": "❌ Error loading server info"
      }
    },`;

console.log('Starting translation updates for EN.JSON...');

// Update EN.JSON
try {
  const enPath = path.join(localesDir, 'en.json');
  const enContent = fs.readFileSync(enPath, 'utf8');

  // Find the settings section and replace it
  const settingsPattern = /(\s*"settings":\s*\{[^}]*"title":\s*"Settings"[^}]*"description":\s*"[^"]*"\s*\},)/;

  if (settingsPattern.test(enContent)) {
    const newContent = enContent.replace(settingsPattern, enSettings + '\n');
    fs.writeFileSync(enPath, newContent, 'utf8');
    console.log('✅ EN.JSON updated successfully');
  } else {
    console.log('❌ Could not find settings pattern in EN.JSON');
  }
} catch (error) {
  console.error('❌ Error updating EN.JSON:', error.message);
}

console.log('\n✅ Translation update process completed!');
