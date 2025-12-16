# late-arrival-authorization

> Auto-generado el 2025-12-14T18:24:06.474Z

## Stages Detectados (9)

### Find Authorizers For Department

- **ID**: `FIND_AUTHORIZERS_FOR_DEPARTMENT`
- **Fuente**: `findAuthorizersForDepartment()` en línea 61

### Find Authorizers Hierarchical

- **ID**: `FIND_AUTHORIZERS_HIERARCHICAL`
- **Fuente**: `findAuthorizersHierarchical()` en línea 84

### Find Authorizers By Hierarchy

- **ID**: `FIND_AUTHORIZERS_BY_HIERARCHY`
- **Fuente**: `findAuthorizersByHierarchy()` en línea 306
- **Servicios llamados**: sequelize.query, this.checkSupervisorAvailability, this.findRRHHByPosition, this.findAuthorizersHierarchical

### Check Supervisor Availability

- **ID**: `CHECK_SUPERVISOR_AVAILABILITY`
- **Fuente**: `checkSupervisorAvailability()` en línea 495
- **Servicios llamados**: sequelize.query

### Find R R H H By Position

- **ID**: `FIND_R_R_H_H_BY_POSITION`
- **Fuente**: `findRRHHByPosition()` en línea 596
- **Servicios llamados**: sequelize.query

### Send Authorization Request

- **ID**: `SEND_AUTHORIZATION_REQUEST`
- **Fuente**: `sendAuthorizationRequest()` en línea 693

### Notify Authorization Result

- **ID**: `NOTIFY_AUTHORIZATION_RESULT`
- **Fuente**: `notifyAuthorizationResult()` en línea 1349

### Check Active Authorization Window

- **ID**: `CHECK_ACTIVE_AUTHORIZATION_WINDOW`
- **Fuente**: `checkActiveAuthorizationWindow()` en línea 1450
- **Servicios llamados**: sequelize.query

### Send Employee Notification Email

- **ID**: `SEND_EMPLOYEE_NOTIFICATION_EMAIL`
- **Fuente**: `sendEmployeeNotificationEmail()` en línea 1500

## Dependencias

- LateArrivalAuthorizationService (core)
