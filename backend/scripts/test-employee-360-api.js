#!/usr/bin/env node
const http = require('http');

const loginReq = http.request({
  hostname: 'localhost',
  port: 9998,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const { token } = JSON.parse(data);
    console.log('Login OK, testing Employee 360...');

    const testReq = http.request({
      hostname: 'localhost',
      port: 9998,
      path: '/api/employee-360/766de495-e4f3-4e91-a509-1a495c52e15c/report',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        const result = JSON.parse(d2);
        console.log('Status:', res2.statusCode);
        if (result.success) {
          console.log('SUCCESS - Report has sections:');
          const r = result.report;
          console.log('- basicInfo:', r.basicInfo ? 'YES' : 'NO');
          console.log('- salary:', r.salary ? 'YES' : 'NO');
          console.log('- salary.salaryHistory:', r.salary && r.salary.salaryHistory ? r.salary.salaryHistory.length + ' records' : 'NO');
          console.log('- salary.payrollRecords:', r.salary && r.salary.payrollRecords ? r.salary.payrollRecords.length + ' records' : 'NO');
          console.log('- documents:', r.documents ? 'YES' : 'NO');
          console.log('- auditHistory:', r.auditHistory ? r.auditHistory.length + ' records' : 'NO');
          console.log('- unionAndLegal:', r.unionAndLegal ? 'YES' : 'NO');
          console.log('- unionAndLegal.legalIssues:', r.unionAndLegal && r.unionAndLegal.legalIssues ? r.unionAndLegal.legalIssues.length + ' records' : 'NO');
        } else {
          console.log('Error:', result.error || JSON.stringify(result).substring(0,500));
        }
      });
    });
    testReq.end();
  });
});
loginReq.write(JSON.stringify({identifier:'admin@isi.com',password:'admin123',companyId:11}));
loginReq.end();
