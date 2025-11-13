# Email Templates - Aponnt System

## Overview

This directory contains **8 professional HTML email templates** for the Aponnt biometric attendance system. All templates are responsive, mobile-friendly, and use inline CSS for maximum email client compatibility.

**Total Lines of Code:** 1,908 lines

---

## Templates Summary

### 1. email-verification.html (212 lines)
**Purpose:** Email verification for new user registrations

**Variables:**
- `{{user_name}}` - First name of user
- `{{user_email}}` - Email being verified
- `{{user_type}}` - Type of user (employee, vendor, etc.)
- `{{verification_link}}` - Full URL with token
- `{{expiration_hours}}` - Token expiration (48)
- `{{pending_consents}}` - Array of consents
- `{{support_email}}` - support@aponnt.com

**Features:**
- Clear verification CTA button
- 48-hour expiration warning
- Pending consents list with required/optional badges
- Security notice
- Manual link fallback
- Mobile-responsive design

---

### 2. ticket-created-client.html (217 lines)
**Purpose:** Confirmation email when client creates a support ticket

**Variables:**
- `{{company_name}}` - Client company name
- `{{ticket_number}}` - TICKET-2025-XXXXXX format
- `{{subject}}` - Ticket subject
- `{{description}}` - Ticket description
- `{{priority}}` - low, medium, high, urgent
- `{{created_at}}` - Creation timestamp
- `{{view_ticket_url}}` - Link to ticket details

**Features:**
- Success confirmation icon
- Prominent ticket number badge
- Priority badge with color coding
- Expected response time (24 hours)
- View ticket CTA button
- Gradient header design

---

### 3. ticket-created-vendor.html (249 lines)
**Purpose:** Notification email when ticket is assigned to vendor

**Variables:**
- `{{vendor_name}}` - Vendor name
- `{{company_name}}` - Client company
- `{{ticket_number}}` - Ticket ID
- `{{subject}}` - Ticket subject
- `{{description}}` - Problem description
- `{{priority}}` - Priority level
- `{{sla_response_time}}` - e.g., "4 hours"
- `{{assigned_at}}` - Assignment timestamp
- `{{manage_ticket_url}}` - Link to vendor panel

**Features:**
- Purple vendor-themed gradient header
- Split display: ticket number + SLA countdown
- Client company badge
- Priority-aware SLA warning (urgent)
- Manage ticket CTA button
- Professional vendor panel branding

---

### 4. ticket-new-message-client.html (187 lines)
**Purpose:** Alert when client receives new message from vendor

**Variables:**
- `{{company_name}}` - Client company
- `{{ticket_number}}` - Ticket reference
- `{{sender_name}}` - Vendor name
- `{{message_preview}}` - First 200 chars
- `{{sent_at}}` - Message timestamp
- `{{view_conversation_url}}` - Link to full conversation

**Features:**
- Message icon with blue theme
- Sender profile badge (avatar with initial)
- Message preview card with italic styling
- View conversation CTA
- Quick reply info box
- Ticket context reference

---

### 5. ticket-new-message-vendor.html (204 lines)
**Purpose:** Alert when vendor receives new message from client

**Variables:**
- `{{vendor_name}}` - Vendor name
- `{{company_name}}` - Client company
- `{{ticket_number}}` - Ticket reference
- `{{sender_name}}` - Client name
- `{{message_preview}}` - First 200 chars
- `{{sent_at}}` - Message timestamp
- `{{reply_url}}` - Quick reply link

**Features:**
- Purple vendor-themed design
- Split info: ticket + client badges
- Sender profile badge
- Message preview card
- Reply to client CTA
- SLA recommendation box
- Action-oriented design

---

### 6. ticket-status-changed.html (302 lines)
**Purpose:** Notification when ticket status changes

**Variables:**
- `{{recipient_name}}` - Recipient name
- `{{ticket_number}}` - Ticket reference
- `{{old_status}}` - Previous status
- `{{new_status}}` - Current status
- `{{changed_by}}` - Who made the change
- `{{status_note}}` - Optional reason for change
- `{{changed_at}}` - Change timestamp
- `{{view_ticket_url}}` - Link to ticket

**Features:**
- Visual status transition (old → new)
- Color-coded status badges:
  - Pending: Gray
  - In Progress: Blue
  - Waiting Client: Amber
  - Resolved: Green
  - Closed: Dark gray
  - Escalated: Red
- Contextual info based on new status
- Changed by and timestamp details
- Optional status note display
- Professional update notification

---

### 7. ticket-escalated.html (262 lines)
**Purpose:** URGENT alert when ticket is escalated to supervisor

**Variables:**
- `{{supervisor_name}}` - Supervisor name
- `{{ticket_number}}` - Escalated ticket ID
- `{{company_name}}` - Affected client
- `{{escalation_reason}}` - Why it was escalated
- `{{original_vendor}}` - Who escalated it
- `{{priority}}` - Should be "urgent"
- `{{escalated_at}}` - Escalation timestamp
- `{{take_over_url}}` - Link to take control

**Features:**
- **RED URGENT GRADIENT** header
- "URGENTE - ESCALACIÓN" banner
- Prominent ticket number with red theme
- Escalation reason highlight
- Original vendor info
- Action items checklist (5 steps)
- 2-hour SLA warning
- Take control CTA button (large, red)
- High-priority visual design

---

### 8. ticket-resolved-request-rating.html (275 lines)
**Purpose:** Confirmation + rating request when ticket is resolved

**Variables:**
- `{{company_name}}` - Client company
- `{{ticket_number}}` - Resolved ticket ID
- `{{subject}}` - Ticket subject
- `{{resolved_by}}` - Vendor who resolved it
- `{{resolved_at}}` - Resolution timestamp
- `{{resolution_note}}` - Solution description
- `{{rating_url}}` - Link to rating form (with ticket ID)

**Features:**
- Green success gradient header
- Success celebration icon (party emoji)
- Ticket summary display
- Resolved by badge (avatar + name + date)
- Optional resolution note
- **Star rating visual** (5 stars)
- Rate service CTA (amber button)
- Why rate? explanation box
- Reopen ticket option (secondary button)
- Thank you message card
- Professional feedback request

---

## Design System

### Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Primary Blue** | `#2563eb` | Main CTA buttons, links |
| **Primary Dark Blue** | `#1d4ed8` | Gradient ends, dark accents |
| **Success Green** | `#10b981` | Resolved status, success messages |
| **Warning Amber** | `#f59e0b` | Ratings, waiting states |
| **Danger Red** | `#dc2626` | Urgent, escalations, errors |
| **Vendor Purple** | `#7c3aed` | Vendor panel theme |
| **Background Gray** | `#f9fafb` | Page background |
| **Light Gray** | `#e5e7eb` | Borders, dividers |
| **Text Dark** | `#111827` | Primary text |
| **Text Medium** | `#4b5563` | Secondary text |
| **Text Light** | `#6b7280` | Tertiary text |

### Typography

- **Font Family:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- **Headings:** 24-32px, font-weight: 700
- **Body:** 14-16px, line-height: 1.6
- **Small Text:** 11-13px

### Components

#### Primary Button
```html
<a href="{{url}}" style="display: inline-block; padding: 16px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
    Button Text
</a>
```

#### Secondary Button
```html
<a href="{{url}}" style="display: inline-block; padding: 12px 32px; background-color: #ffffff; color: #2563eb; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 6px; border: 2px solid #2563eb;">
    Button Text
</a>
```

#### Status Badges
- **Urgent:** `background: #fee2e2; color: #dc2626; 🔴`
- **High:** `background: #fef3c7; color: #d97706; 🟡`
- **Medium:** `background: #dbeafe; color: #1d4ed8; 🔵`
- **Low:** `background: #d1fae5; color: #059669; 🟢`

#### Info Boxes
```html
<div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 16px 20px; border-radius: 6px;">
    <table>
        <tr>
            <td width="30" valign="top">
                <span style="font-size: 20px;">💡</span>
            </td>
            <td>
                <div style="font-size: 13px; color: #075985; line-height: 1.5;">
                    Info text here
                </div>
            </td>
        </tr>
    </table>
</div>
```

---

## Handlebars/Mustache Helpers

All templates support standard Handlebars syntax:

```handlebars
{{variable}}                    // Simple variable
{{#if condition}}...{{/if}}     // Conditional
{{#unless condition}}...{{/unless}}  // Negative conditional
{{#each array}}...{{/each}}     // Loop
{{#if (eq var "value")}}...{{/if}}   // Equality check
{{substr string 0 1}}           // Substring (for avatars)
```

---

## Email Client Compatibility

All templates use **table-based layout with inline CSS** for maximum compatibility:

✅ **Tested Clients:**
- Gmail (web, iOS, Android)
- Outlook (2016+, Office 365, web)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- ProtonMail
- Thunderbird

✅ **Responsive Design:**
- Desktop: 600px width
- Mobile: Fluid layout with media queries
- Tablet: Adaptive column stacking

---

## Integration Guide

### Using with EmailService

```javascript
// In EmailService.js
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

async function sendEmailVerification(userEmail, userData) {
    const templatePath = path.join(__dirname, '../../templates/emails/email-verification.html');
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    const html = template({
        user_name: userData.firstName,
        user_email: userEmail,
        user_type: userData.userType,
        verification_link: `https://app.aponnt.com/verify?token=${userData.token}`,
        expiration_hours: 48,
        pending_consents: userData.pendingConsents,
        support_email: 'support@aponnt.com'
    });

    await sendFromAponnt({
        to: userEmail,
        subject: 'Verifica tu correo electrónico - Aponnt',
        html: html
    });
}
```

### Required NPM Packages

```json
{
    "dependencies": {
        "handlebars": "^4.7.7",
        "nodemailer": "^6.9.0"
    }
}
```

---

## Testing Templates

### 1. Visual Testing (Recommended)

Use [Litmus](https://litmus.com) or [Email on Acid](https://www.emailonacid.com):
- Upload HTML file
- Test across 90+ clients
- Check responsive design
- Validate accessibility

### 2. Manual Testing

```javascript
// test-email-template.js
const handlebars = require('handlebars');
const fs = require('fs').promises;

async function testTemplate(templateName, sampleData) {
    const html = await fs.readFile(`templates/emails/${templateName}.html`, 'utf-8');
    const template = handlebars.compile(html);
    const output = template(sampleData);

    console.log('Template rendered successfully!');
    await fs.writeFile(`test-output-${templateName}.html`, output);
}

// Test data
testTemplate('email-verification', {
    user_name: 'Juan Pérez',
    user_email: 'juan@empresa.com',
    user_type: 'Empleado',
    verification_link: 'https://app.aponnt.com/verify?token=abc123',
    expiration_hours: 48,
    pending_consents: [
        {
            title: 'Política de Privacidad',
            description: 'Acepto el tratamiento de mis datos personales',
            is_required: true
        },
        {
            title: 'Notificaciones por Email',
            description: 'Recibir actualizaciones por correo',
            is_required: false
        }
    ],
    support_email: 'support@aponnt.com'
});
```

### 3. Send Test Email

```javascript
// send-test-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});

await transporter.sendMail({
    from: '"Aponnt Test" <no-reply@aponnt.com>',
    to: 'test-recipient@example.com',
    subject: 'Test: Email Verification',
    html: renderedTemplate
});
```

---

## File Sizes

| Template | Lines | Size | Load Time* |
|----------|-------|------|-----------|
| email-verification.html | 212 | 14.7 KB | <1s |
| ticket-created-client.html | 217 | 15.6 KB | <1s |
| ticket-created-vendor.html | 249 | 18.3 KB | <1s |
| ticket-new-message-client.html | 187 | 12.5 KB | <1s |
| ticket-new-message-vendor.html | 204 | 14.0 KB | <1s |
| ticket-status-changed.html | 302 | 22.7 KB | <1s |
| ticket-escalated.html | 262 | 19.4 KB | <1s |
| ticket-resolved-request-rating.html | 275 | 19.8 KB | <1s |

*Estimated load time on 3G connection

**Total:** 1,908 lines, ~137 KB

All templates are **well under the 100 KB Gmail clipping limit** (102 KB).

---

## Accessibility Features

✅ **Semantic HTML**
- Proper heading hierarchy (h1, h2)
- Table role="presentation" for layout
- Alt text on images (if added)

✅ **Color Contrast**
- WCAG AA compliant (4.5:1 minimum)
- Text readable on all backgrounds
- Status colors distinguishable

✅ **Screen Reader Support**
- Meaningful link text (no "click here")
- Descriptive button labels
- Logical reading order

✅ **Keyboard Navigation**
- All CTAs are focusable links
- Tab order follows visual flow

---

## Customization Guide

### Changing Colors

1. Open template file
2. Find color hex codes (e.g., `#2563eb`)
3. Replace with your brand colors
4. Test in email clients

### Adding Logo Image

```html
<!-- In header section -->
<td align="center">
    <img src="https://cdn.aponnt.com/logo.png"
         alt="Aponnt Logo"
         width="150"
         style="display: block; max-width: 150px; height: auto;" />
</td>
```

### Adding Social Links

```html
<!-- In footer section -->
<td align="center" style="padding: 20px 0;">
    <a href="https://facebook.com/aponnt" style="margin: 0 8px;">
        <img src="https://cdn.aponnt.com/facebook-icon.png"
             alt="Facebook"
             width="32"
             height="32" />
    </a>
    <a href="https://twitter.com/aponnt" style="margin: 0 8px;">
        <img src="https://cdn.aponnt.com/twitter-icon.png"
             alt="Twitter"
             width="32"
             height="32" />
    </a>
</td>
```

---

## Troubleshooting

### Issue: Images not loading
**Solution:** Use absolute URLs with HTTPS, not relative paths

### Issue: Broken layout in Outlook
**Solution:** Ensure all tables have `cellspacing="0" cellpadding="0" border="0"`

### Issue: Gmail clipping email
**Solution:** Keep total size under 100 KB, remove comments and whitespace

### Issue: Dark mode breaks design
**Solution:** Add dark mode CSS (optional):
```html
<style>
@media (prefers-color-scheme: dark) {
    .dark-mode-bg { background-color: #1f2937 !important; }
    .dark-mode-text { color: #f9fafb !important; }
}
</style>
```

---

## Version History

- **v1.0.0** (2025-01-01) - Initial release
  - 8 email templates
  - 1,908 lines of code
  - Full Handlebars support
  - Mobile-responsive design
  - WCAG AA accessibility

---

## License

© 2025 Aponnt - Sistema de Asistencia Biométrico
Internal use only. All rights reserved.

---

## Support

For questions about these templates:
- **Technical Issues:** support@aponnt.com
- **Design Questions:** Contact development team
- **Email Delivery:** Check SMTP configuration

---

**Last Updated:** January 2025
**Maintained By:** Aponnt Development Team
