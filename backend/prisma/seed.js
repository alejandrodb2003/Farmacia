"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt_1 = __importDefault(require("bcrypt"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var farmaciaA, farmaciaB, hash, med1, med2, fechaVencimientoCercana, fechaVencimientoLejana;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Iniciando seedeo de la base de datos...');
                    // 1. Limpiar BD (opcional, cuidado en prod)
                    return [4 /*yield*/, prisma.reservation.deleteMany()];
                case 1:
                    // 1. Limpiar BD (opcional, cuidado en prod)
                    _a.sent();
                    return [4 /*yield*/, prisma.inventoryItem.deleteMany()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.medication.deleteMany()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.license.deleteMany()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, prisma.pharmacy.deleteMany()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma.pharmacy.create({
                            data: { name: 'Farmacia Central', cuit: '30701234568', email: 'central@farmacia.com', city: 'Buenos Aires', address: 'Av. Corrientes 1234' }
                        })];
                case 7:
                    farmaciaA = _a.sent();
                    return [4 /*yield*/, prisma.pharmacy.create({
                            data: { name: 'Farmacia Del Pueblo', cuit: '30706543218', email: 'pueblo@farmacia.com', city: 'Buenos Aires', address: 'Av. Cabildo 4321' }
                        })];
                case 8:
                    farmaciaB = _a.sent();
                    return [4 /*yield*/, bcrypt_1.default.hash('123456', 10)];
                case 9:
                    hash = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: { name: 'Admin Central', email: 'central@farmacia.com', password: hash, role: 'PHARMACY_ADMIN', pharmacyId: farmaciaA.id }
                        })];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: { name: 'Admin Pueblo', email: 'pueblo@farmacia.com', password: hash, role: 'PHARMACY_ADMIN', pharmacyId: farmaciaB.id }
                        })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, prisma.medication.create({
                            data: { barcode: '7791234567890', name: 'Ibuprofeno 600mg', genericName: 'Ibuprofeno', laboratory: 'Bayer', presentation: 'Caja x30 comp.' }
                        })];
                case 12:
                    med1 = _a.sent();
                    return [4 /*yield*/, prisma.medication.create({
                            data: { barcode: '7790987654321', name: 'Amoxicilina 500mg', genericName: 'Amoxicilina', laboratory: 'Roemmers', presentation: 'Caja x16 comp.' }
                        })];
                case 13:
                    med2 = _a.sent();
                    fechaVencimientoCercana = new Date();
                    fechaVencimientoCercana.setMonth(fechaVencimientoCercana.getMonth() + 2); // Vence en 2 meses
                    fechaVencimientoLejana = new Date();
                    fechaVencimientoLejana.setMonth(fechaVencimientoLejana.getMonth() + 10); // Vence en 10 meses
                    return [4 /*yield*/, prisma.inventoryItem.create({
                            data: { pharmacyId: farmaciaB.id, medicationId: med1.id, batch: 'LOTE-123', quantity: 15, expirationDate: fechaVencimientoCercana }
                        })];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, prisma.inventoryItem.create({
                            data: { pharmacyId: farmaciaB.id, medicationId: med2.id, batch: 'LOTE-999', quantity: 50, expirationDate: fechaVencimientoLejana }
                        })];
                case 15:
                    _a.sent();
                    console.log('✅ Base de datos poblada con éxito.');
                    console.log('--------------------------------------------------');
                    console.log('Para probar, iniciá sesión con:');
                    console.log('Email: central@farmacia.com');
                    console.log('Clave: 123456');
                    console.log('--------------------------------------------------');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
