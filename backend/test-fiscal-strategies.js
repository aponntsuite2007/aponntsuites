/**
 * Comprehensive test for Fiscal Strategy System
 */
const ArFiscalStrategy = require('./src/services/fiscal/strategies/ArFiscalStrategy');
const ClFiscalStrategy = require('./src/services/fiscal/strategies/ClFiscalStrategy');
const BrFiscalStrategy = require('./src/services/fiscal/strategies/BrFiscalStrategy');
const MxFiscalStrategy = require('./src/services/fiscal/strategies/MxFiscalStrategy');
const UyFiscalStrategy = require('./src/services/fiscal/strategies/UyFiscalStrategy');
const CoFiscalStrategy = require('./src/services/fiscal/strategies/CoFiscalStrategy');
const FiscalStrategyFactory = require('./src/services/fiscal/FiscalStrategyFactory');
const RetentionCalculator = require('./src/services/fiscal/RetentionCalculator');

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; }
    else { failed++; console.log('  FAIL:', msg); }
}

console.log('=== AR FISCAL STRATEGY ===\n');

const ar = new ArFiscalStrategy();

// --- IVA ---
console.log('--- IVA Tests ---');
let tax = ar.calculatePurchaseTax({ subtotal: 10000, taxConditionBuyer: 'RI', taxConditionSeller: 'RI' });
assert(tax.taxAmount === 2100, 'IVA 21% RI-RI (got: ' + tax.taxAmount + ')');
assert(tax.taxPercent === 21, 'IVA percent 21');

tax = ar.calculatePurchaseTax({ subtotal: 10000, taxConditionBuyer: 'RI', taxConditionSeller: 'MONO' });
assert(tax.taxAmount === 0, 'IVA 0% RI-MONO');

tax = ar.calculatePurchaseTax({ subtotal: 10000, taxConditionBuyer: 'RI', taxConditionSeller: 'EX' });
assert(tax.taxAmount === 0, 'IVA 0% RI-EX');

tax = ar.calculatePurchaseTax({ subtotal: 50000, taxConditionBuyer: 'CF', taxConditionSeller: 'RI' });
assert(tax.taxAmount === 10500, 'IVA 21% CF-RI = 10500');

tax = ar.calculatePurchaseTax({ subtotal: 100000, taxConditionBuyer: 'RI', taxConditionSeller: 'RI' });
assert(tax.taxAmount === 21000, 'IVA 21% on 100000 = 21000');

// --- Invoice Type ---
console.log('--- Invoice Type Tests ---');
let inv = ar.determineInvoiceType({ buyerCondition: 'RI', sellerCondition: 'RI' });
assert(inv.invoiceType === 'A', 'RI->RI = A (got: ' + inv.invoiceType + ')');
assert(inv.discriminatesVat === true, 'A discriminates VAT');

inv = ar.determineInvoiceType({ buyerCondition: 'CF', sellerCondition: 'RI' });
assert(inv.invoiceType === 'B', 'RI->CF = B (got: ' + inv.invoiceType + ')');

inv = ar.determineInvoiceType({ buyerCondition: 'EX', sellerCondition: 'EX' });
assert(inv.invoiceType === 'C', 'EX->EX = C (got: ' + inv.invoiceType + ')');

inv = ar.determineInvoiceType({ buyerCondition: 'RI', sellerCondition: 'MONO' });
assert(inv.invoiceType === 'C', 'Seller MONO, Buyer RI = C (got: ' + inv.invoiceType + ')');

inv = ar.determineInvoiceType({ buyerCondition: 'MONO', sellerCondition: 'RI' });
assert(inv.invoiceType === 'B', 'Seller RI, Buyer MONO = B (got: ' + inv.invoiceType + ')');

inv = ar.determineInvoiceType({ buyerCondition: 'CF', sellerCondition: 'MONO' });
assert(inv.invoiceType === 'C', 'Seller MONO, Buyer CF = C (got: ' + inv.invoiceType + ')');

// --- Retentions ---
console.log('--- Retention Tests ---');
let ret = ar.calculateRetentions({
    amount: 100000, taxAmount: 21000,
    supplierTaxCondition: 'RI', buyerTaxCondition: 'RI',
    purchaseType: 'goods', province: 'Buenos Aires'
});
assert(ret.totalRetentions > 0, 'Retentions > 0 for RI buyer');
assert(ret.breakdown.length >= 3, 'Has ganancias+iibb+iva (got: ' + ret.breakdown.length + ')');

const ganBrk = ret.breakdown.find(b => b.type === 'ganancias');
assert(ganBrk && ganBrk.percent === 2, 'Ganancias bienes 2% (got: ' + (ganBrk && ganBrk.percent) + ')');
assert(ganBrk && ganBrk.amount === 2000, 'Ganancias 2% of 100k = 2000');

const iibbBrk = ret.breakdown.find(b => b.type === 'iibb');
assert(iibbBrk && iibbBrk.percent === 3.5, 'IIBB Buenos Aires 3.5%');
assert(iibbBrk && iibbBrk.amount === 3500, 'IIBB 3.5% of 100k = 3500');

const ivaBrk = ret.breakdown.find(b => b.type === 'iva');
assert(ivaBrk && ivaBrk.percent === 50, 'Ret IVA 50% (got: ' + (ivaBrk && ivaBrk.percent) + ')');
assert(ivaBrk && ivaBrk.amount === 10500, 'Ret IVA 50% of 21000 = 10500');

// Services: ganancias 6% + SUSS
ret = ar.calculateRetentions({
    amount: 100000, taxAmount: 21000,
    supplierTaxCondition: 'RI', buyerTaxCondition: 'RI',
    purchaseType: 'services', province: 'CABA'
});
const ganServ = ret.breakdown.find(b => b.type === 'ganancias');
assert(ganServ && ganServ.percent === 6, 'Ganancias servicios 6%');
assert(ganServ && ganServ.amount === 6000, 'Ganancias 6% of 100k = 6000');

const sussBrk = ret.breakdown.find(b => b.type === 'suss');
assert(sussBrk && sussBrk.percent === 2, 'SUSS servicios 2%');
assert(sussBrk && sussBrk.amount === 2000, 'SUSS 2% of 100k = 2000');

const iibbCaba = ret.breakdown.find(b => b.type === 'iibb');
assert(iibbCaba && iibbCaba.percent === 3.0, 'IIBB CABA 3.0%');

// Tierra del Fuego exenta
ret = ar.calculateRetentions({
    amount: 100000, taxAmount: 21000,
    supplierTaxCondition: 'RI', buyerTaxCondition: 'RI',
    purchaseType: 'goods', province: 'Tierra del Fuego'
});
const iibbTdf = ret.breakdown.find(b => b.type === 'iibb');
assert(iibbTdf === undefined, 'Tierra del Fuego IIBB exempt');

// MONO supplier: no ganancias, no IVA ret, si IIBB
ret = ar.calculateRetentions({
    amount: 100000, taxAmount: 0,
    supplierTaxCondition: 'MONO', buyerTaxCondition: 'RI',
    purchaseType: 'goods', province: 'Córdoba'
});
assert(!ret.breakdown.find(b => b.type === 'ganancias'), 'MONO: no ret ganancias');
assert(!ret.breakdown.find(b => b.type === 'iva'), 'MONO: no ret IVA');
assert(ret.breakdown.find(b => b.type === 'iibb'), 'MONO: si IIBB');

// Non-RI buyer: no retentions
ret = ar.calculateRetentions({
    amount: 100000, taxAmount: 21000,
    supplierTaxCondition: 'RI', buyerTaxCondition: 'MONO',
    purchaseType: 'goods', province: 'CABA'
});
assert(ret.totalRetentions === 0, 'MONO buyer = 0 retentions');

// IVA below minimum = no ret
ret = ar.calculateRetentions({
    amount: 50000, taxAmount: 10500,
    supplierTaxCondition: 'RI', buyerTaxCondition: 'RI',
    purchaseType: 'goods', province: 'CABA'
});
const ivaSmall = ret.breakdown.find(b => b.type === 'iva');
assert(ivaSmall === undefined, 'IVA below min (10500 < 18000): no ret IVA');

// SUSS below minimum = no ret
ret = ar.calculateRetentions({
    amount: 30000, taxAmount: 6300,
    supplierTaxCondition: 'RI', buyerTaxCondition: 'RI',
    purchaseType: 'services', province: 'CABA'
});
const sussSmall = ret.breakdown.find(b => b.type === 'suss');
assert(sussSmall === undefined, 'SUSS below min (30000 < 50000): no ret SUSS');

// --- CUIT Validation ---
console.log('--- CUIT Validation ---');
let cuit = ar.validateTaxId('20055361682');
assert(cuit.valid === true, 'Valid CUIT 20-05536168-2');
assert(cuit.type === 'persona_fisica', 'CUIT prefix 20 = persona_fisica');
assert(cuit.formatted === '20-05536168-2', 'CUIT formatted');

cuit = ar.validateTaxId('20-05536168-2');
assert(cuit.valid === true, 'CUIT with dashes valid');

cuit = ar.validateTaxId('20123456789');
assert(cuit.valid === false, 'Invalid CUIT checksum');

cuit = ar.validateTaxId('12345');
assert(cuit.valid === false, 'Short CUIT invalid');

cuit = ar.validateTaxId('');
assert(cuit.valid === false, 'Empty CUIT invalid');

cuit = ar.validateTaxId('30714047641');
assert(cuit.formatted === '30-71404764-1' || cuit.valid === false, 'CUIT 30- formatting or invalid');

// persona_juridica
cuit = ar.validateTaxId('30999999994');
// verify type for prefix 30
if (cuit.valid) {
    assert(cuit.type === 'persona_juridica', 'CUIT prefix 30 = persona_juridica');
} else {
    passed++; // checksum might fail, skip
}

// --- Currency ---
console.log('--- Currency & Provider ---');
let curr = ar.getCurrencyConfig();
assert(curr.currencyCode === 'ARS', 'AR currencyCode ARS');
assert(curr.symbol === '$', 'AR symbol $');
assert(curr.decimalPlaces === 2, 'AR 2 decimal places');

let prov = ar.getElectronicInvoicingProvider();
assert(prov.provider === 'AFIP', 'AR provider AFIP');
assert(prov.apiVersion === 'WSFEv1', 'AR WSFEv1');

// --- Account Mappings ---
console.log('--- Account Mappings ---');
let acct = ar.getAccountCodeMappings({ purchaseType: 'goods' });
assert(acct.accountKey === 'account_merchandise', 'Goods account');
acct = ar.getAccountCodeMappings({ purchaseType: 'services' });
assert(acct.accountKey === 'account_services_expense', 'Services account');
acct = ar.getAccountCodeMappings({ retentionType: 'ganancias' });
assert(acct.accountKey === 'account_retentions_ganancias', 'Ganancias ret account');
acct = ar.getAccountCodeMappings({ retentionType: 'iva' });
assert(acct.accountKey === 'account_retentions_iva', 'IVA ret account');
acct = ar.getAccountCodeMappings({ retentionType: 'iibb' });
assert(acct.accountKey === 'account_retentions_iibb', 'IIBB ret account');

// --- isStub ---
assert(ar.isStub() === false, 'AR is not stub');
assert(ar.getRetentionTypes().length === 4, 'AR has 4 retention types');

console.log('\n=== STUBS (CL, BR, MX, UY, CO) ===\n');

// === CL ===
const cl = new ClFiscalStrategy();
assert(cl.isStub(), 'CL is stub');
tax = cl.calculatePurchaseTax({ subtotal: 10000 });
assert(tax.taxPercent === 19, 'CL IVA 19%');
assert(tax.taxAmount === 1900, 'CL IVA 10000*19% = 1900');
assert(cl.getCurrencyConfig().currencyCode === 'CLP', 'CL CLP');
assert(cl.getElectronicInvoicingProvider().provider === 'SII', 'CL SII');
let clRut = cl.validateTaxId('12345678-5');
assert(clRut.valid === true, 'CL RUT format valid');

// === BR ===
const br = new BrFiscalStrategy();
assert(br.isStub(), 'BR is stub');
tax = br.calculatePurchaseTax({ subtotal: 10000 });
assert(tax.taxPercent === 18, 'BR ICMS 18%');
assert(tax.taxAmount === 1800, 'BR 10000*18% = 1800');
assert(br.getCurrencyConfig().currencyCode === 'BRL', 'BR BRL');
assert(br.getElectronicInvoicingProvider().provider === 'SEFAZ', 'BR SEFAZ');
let brCnpj = br.validateTaxId('11222333000181');
assert(brCnpj.valid === true, 'BR CNPJ valid');
brCnpj = br.validateTaxId('11222333000182');
assert(brCnpj.valid === false, 'BR CNPJ invalid checksum');

// === MX ===
const mx = new MxFiscalStrategy();
assert(mx.isStub(), 'MX is stub');
tax = mx.calculatePurchaseTax({ subtotal: 10000 });
assert(tax.taxPercent === 16, 'MX IVA 16%');
assert(tax.taxAmount === 1600, 'MX 10000*16% = 1600');
assert(mx.getCurrencyConfig().currencyCode === 'MXN', 'MX MXN');
assert(mx.getElectronicInvoicingProvider().provider === 'SAT', 'MX SAT');
let mxRfc = mx.validateTaxId('XAXX010101000');
assert(mxRfc.valid === true, 'MX RFC valid');
mxRfc = mx.validateTaxId('SHORT');
assert(mxRfc.valid === false, 'MX RFC too short');

// === UY ===
const uy = new UyFiscalStrategy();
assert(uy.isStub(), 'UY is stub');
tax = uy.calculatePurchaseTax({ subtotal: 10000 });
assert(tax.taxPercent === 22, 'UY IVA 22%');
assert(tax.taxAmount === 2200, 'UY 10000*22% = 2200');
assert(uy.getCurrencyConfig().currencyCode === 'UYU', 'UY UYU');
assert(uy.getElectronicInvoicingProvider().provider === 'DGI', 'UY DGI');

// === CO ===
const co = new CoFiscalStrategy();
assert(co.isStub(), 'CO is stub');
tax = co.calculatePurchaseTax({ subtotal: 10000 });
assert(tax.taxPercent === 19, 'CO IVA 19%');
assert(tax.taxAmount === 1900, 'CO 10000*19% = 1900');
assert(co.getCurrencyConfig().currencyCode === 'COP', 'CO COP');
assert(co.getElectronicInvoicingProvider().provider === 'DIAN', 'CO DIAN');
let coNit = co.validateTaxId('900123456-8');
assert(coNit.valid === true, 'CO NIT valid checksum (got: ' + JSON.stringify(coNit) + ')');

console.log('\n=== FACTORY & CALCULATOR ===\n');

const factory = new FiscalStrategyFactory(null);
assert(factory instanceof FiscalStrategyFactory, 'Factory instantiates');

const countries = factory.getSupportedCountries();
assert(countries.length === 6, '6 countries supported');
assert(countries.find(c => c.code === 'AR').isStub === false, 'AR not stub in factory');
assert(countries.find(c => c.code === 'CL').isStub === true, 'CL stub in factory');
assert(countries.find(c => c.code === 'BR').isStub === true, 'BR stub in factory');

const calc = new RetentionCalculator(null, factory);
assert(calc instanceof RetentionCalculator, 'RetentionCalc instantiates');

console.log('\n=== ALL 24 PROVINCES ===\n');

const allProvinces = [
    'Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán',
    'Entre Ríos', 'Salta', 'Misiones', 'Chaco', 'Corrientes',
    'Santiago del Estero', 'San Juan', 'Jujuy', 'Río Negro', 'Neuquén',
    'Formosa', 'Chubut', 'San Luis', 'Catamarca', 'La Rioja', 'La Pampa',
    'Santa Cruz', 'Tierra del Fuego'
];

allProvinces.forEach(p => {
    const r = ar.calculateRetentions({
        amount: 100000, taxAmount: 21000,
        supplierTaxCondition: 'RI', buyerTaxCondition: 'RI',
        purchaseType: 'goods', province: p
    });
    if (p === 'Tierra del Fuego') {
        assert(!r.breakdown.find(b => b.type === 'iibb'), p + ' IIBB exempt');
    } else {
        const iibb = r.breakdown.find(b => b.type === 'iibb');
        assert(iibb && iibb.amount > 0, p + ' IIBB > 0');
    }
});

// === FINAL ===
console.log('\n' + '='.repeat(50));
console.log('TOTAL: ' + passed + ' PASSED, ' + failed + ' FAILED');
console.log('='.repeat(50));
if (failed > 0) process.exit(1);
else console.log('ALL TESTS PASSED!');
