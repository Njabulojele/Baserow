"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.withTenant = withTenant;
var adapter_pg_1 = require("@prisma/adapter-pg");
var client_1 = require("@prisma/client");
var softDeleteModels = [
    "User",
    "Project",
    "Task",
    "Client",
    "Deal",
    "CanvasBoard",
];
// Standard Prisma client for Vercel deployment
// The PrismaPg adapter is ONLY used in research-engine (Render)
var prismaClientSingleton = function () {
    var baseClient = new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({
            connectionString: process.env.DATABASE_URL,
            max: 5, // Neon free-tier-friendly pool size
            idleTimeoutMillis: 30000, // Close idle connections after 30s
            connectionTimeoutMillis: 15000, // Wait up to 15s for a connection (Neon cold start)
        }),
        transactionOptions: {
            maxWait: 15000, // Wait up to 15s to acquire a connection for transactions
            timeout: 30000, // Allow transactions up to 30s to complete
        },
    });
    return baseClient.$extends({
        query: {
            $allModels: {
                delete: function (_a) {
                    return __awaiter(this, arguments, void 0, function (_b) {
                        var model = _b.model, args = _b.args, query = _b.query;
                        return __generator(this, function (_c) {
                            if (softDeleteModels.includes(model)) {
                                return [2 /*return*/, baseClient[model].update(__assign(__assign({}, args), { data: { deletedAt: new Date() } }))];
                            }
                            return [2 /*return*/, query(args)];
                        });
                    });
                },
                deleteMany: function (_a) {
                    return __awaiter(this, arguments, void 0, function (_b) {
                        var model = _b.model, args = _b.args, query = _b.query;
                        return __generator(this, function (_c) {
                            if (softDeleteModels.includes(model)) {
                                return [2 /*return*/, baseClient[model].updateMany({
                                        where: args === null || args === void 0 ? void 0 : args.where,
                                        data: { deletedAt: new Date() },
                                    })];
                            }
                            return [2 /*return*/, query(args)];
                        });
                    });
                },
                findMany: function (_a) {
                    return __awaiter(this, arguments, void 0, function (_b) {
                        var model = _b.model, args = _b.args, query = _b.query;
                        return __generator(this, function (_c) {
                            if (softDeleteModels.includes(model)) {
                                return [2 /*return*/, query(__assign(__assign({}, args), { where: __assign({ deletedAt: null }, ((args === null || args === void 0 ? void 0 : args.where) || {})) }))];
                            }
                            return [2 /*return*/, query(args)];
                        });
                    });
                },
                findFirst: function (_a) {
                    return __awaiter(this, arguments, void 0, function (_b) {
                        var model = _b.model, args = _b.args, query = _b.query;
                        return __generator(this, function (_c) {
                            if (softDeleteModels.includes(model)) {
                                return [2 /*return*/, query(__assign(__assign({}, args), { where: __assign({ deletedAt: null }, ((args === null || args === void 0 ? void 0 : args.where) || {})) }))];
                            }
                            return [2 /*return*/, query(args)];
                        });
                    });
                },
            },
        },
    });
};
var prisma = (_a = globalThis.prismaGlobal) !== null && _a !== void 0 ? _a : prismaClientSingleton();
exports.prisma = prisma;
/**
 * Executes a Prisma query within an RLS-enforced transaction.
 * The inner callback receives a transaction-bound Prisma client `tx`.
 * This ensures that cross-tenant data leaks are impossible at the DB level.
 */
function withTenant(organizationId, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            if (!organizationId) {
                // If no organization is specified, simply execute without setting the tenant context
                // The policy defaults to allowing access if organizationId IS NULL for the record
                return [2 /*return*/, callback(prisma)];
            }
            return [2 /*return*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            // Set the Postgres local transaction variable
                            return [4 /*yield*/, tx.$executeRawUnsafe("SELECT set_config('app.current_tenant', $1, true)", organizationId)];
                            case 1:
                                // Set the Postgres local transaction variable
                                _a.sent();
                                // Execute the user's callback with the transaction object `tx`
                                return [2 /*return*/, callback(tx)];
                        }
                    });
                }); })];
        });
    });
}
if (process.env.NODE_ENV !== "production")
    globalThis.prismaGlobal = prisma;
