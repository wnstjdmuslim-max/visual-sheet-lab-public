var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, filmGrabBenchmarks, characterPromptBenchmarks;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      /**
       * Surrogate primary key. Auto-incremented numeric value managed by the database.
       * Use this for relations between tables.
       */
      id: int("id").autoincrement().primaryKey(),
      /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    filmGrabBenchmarks = mysqlTable("filmGrabBenchmarks", {
      id: int("id").autoincrement().primaryKey(),
      filmTitle: varchar("filmTitle", { length: 255 }).notNull(),
      sourcePage: varchar("sourcePage", { length: 512 }).notNull().unique(),
      imageUrls: text("imageUrls").notNull(),
      palette: text("palette").notNull(),
      analysis: text("analysis").notNull(),
      sourceUpdatedAt: timestamp("sourceUpdatedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    characterPromptBenchmarks = mysqlTable("characterPromptBenchmarks", {
      id: int("id").autoincrement().primaryKey(),
      caseName: varchar("caseName", { length: 128 }).notNull().unique(),
      platform: varchar("platform", { length: 64 }).notNull(),
      strength: varchar("strength", { length: 64 }).notNull(),
      inputFields: text("inputFields").notNull(),
      outputPrompts: text("outputPrompts").notNull(),
      sourceLabel: varchar("sourceLabel", { length: 255 }).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/db.ts
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function listFilmGrabBenchmarks() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(filmGrabBenchmarks).orderBy(desc(filmGrabBenchmarks.filmTitle));
  } catch (error) {
    console.warn("[Database] Film Grab list unavailable:", error);
    return [];
  }
}
async function upsertFilmGrabBenchmark(item) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(filmGrabBenchmarks).values(item).onDuplicateKeyUpdate({
    set: {
      filmTitle: item.filmTitle,
      imageUrls: item.imageUrls,
      palette: item.palette,
      analysis: item.analysis,
      sourceUpdatedAt: item.sourceUpdatedAt,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function countFilmGrabBenchmarks() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const rows = await db.select({ id: filmGrabBenchmarks.id }).from(filmGrabBenchmarks);
    return rows.length;
  } catch (error) {
    console.warn("[Database] Film Grab count unavailable:", error);
    return 0;
  }
}
async function listCharacterPromptBenchmarks() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(characterPromptBenchmarks).orderBy(desc(characterPromptBenchmarks.caseName));
  } catch (error) {
    console.warn("[Database] Character benchmark list unavailable:", error);
    return [];
  }
}
async function upsertCharacterPromptBenchmark(item) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(characterPromptBenchmarks).values(item).onDuplicateKeyUpdate({
    set: {
      platform: item.platform,
      strength: item.strength,
      inputFields: item.inputFields,
      outputPrompts: item.outputPrompts,
      sourceLabel: item.sourceLabel,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/filmGrabSeed.ts
var filmGrabSeed;
var init_filmGrabSeed = __esm({
  "server/filmGrabSeed.ts"() {
    "use strict";
    filmGrabSeed = [
      {
        "filmTitle": "Oldboy (2013)",
        "sourcePage": "https://film-grab.com/2026/07/17/oldboy-2013/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Oldboy_2013_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#404040",
          "#002020",
          "#404020",
          "#606060",
          "#200000",
          "#202000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#404040",
            "#002020",
            "#404020",
            "#606060",
            "#200000",
            "#202000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.23739175577001634,
            "mean_saturation": 0.478081275275952,
            "mean_warmth": 0.007016356889978214
          }
        }
      },
      {
        "filmTitle": "The Witches",
        "sourcePage": "https://film-grab.com/2026/08/06/the-witches/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Witches_09.jpg"
        ],
        "palette": [
          "#404020",
          "#808080",
          "#402020",
          "#404040",
          "#202020",
          "#A0A0A0",
          "#604020",
          "#200000"
        ],
        "analysis": {
          "palette": [
            "#404020",
            "#808080",
            "#402020",
            "#404040",
            "#202020",
            "#A0A0A0",
            "#604020",
            "#200000"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.3976937799564271,
            "mean_saturation": 0.32449299181969515,
            "mean_warmth": 0.05390795206971678
          }
        }
      },
      {
        "filmTitle": "The Great Gatsby",
        "sourcePage": "https://film-grab.com/2026/06/25/the-great-gatsby/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby001.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby002.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby003.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby004.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby005.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby006.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby007.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby008.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/gatsby009.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#404040",
          "#202040",
          "#402020",
          "#804040",
          "#604040",
          "#002020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#404040",
            "#202040",
            "#402020",
            "#804040",
            "#604040",
            "#002020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.23064980128336054,
            "mean_saturation": 0.41960469736803163,
            "mean_warmth": 0.04497506467864923
          }
        }
      },
      {
        "filmTitle": "Illang: The Wolf Brigade",
        "sourcePage": "https://film-grab.com/2026/08/05/illang-the-wolf-brigade/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Illang_The_Wolf_Brigade_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#002020",
          "#404040",
          "#000020",
          "#202040",
          "#204040",
          "#402020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#002020",
            "#404040",
            "#000020",
            "#202040",
            "#204040",
            "#402020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.150607644165305,
            "mean_saturation": 0.38329588424533717,
            "mean_warmth": -0.011852362472766886
          }
        }
      },
      {
        "filmTitle": "Space Sweepers",
        "sourcePage": "https://film-grab.com/2026/06/28/space-sweepers/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Space_Sweepers_09.jpg"
        ],
        "palette": [
          "#202020",
          "#604020",
          "#000020",
          "#600020",
          "#402020",
          "#002020",
          "#404020",
          "#002000"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#604020",
            "#000020",
            "#600020",
            "#402020",
            "#002020",
            "#404020",
            "#002000"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Rich / vivid",
          "contrast": "Soft / controlled",
          "temperature": "Warm",
          "bias": "Balanced chroma",
          "mood": "Energetic / saturated",
          "raw_metrics": {
            "mean_luma": 0.35839483013344225,
            "mean_saturation": 0.5447554678987463,
            "mean_warmth": 0.096359272875817
          }
        }
      },
      {
        "filmTitle": "Mouchette",
        "sourcePage": "https://film-grab.com/2026/07/09/mouchette/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Mouchette_09.jpg"
        ],
        "palette": [
          "#202020",
          "#404040",
          "#000000",
          "#606060",
          "#808080",
          "#A0A0A0",
          "#C0C0C0",
          "#E0E0E0"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#404040",
            "#000000",
            "#606060",
            "#808080",
            "#A0A0A0",
            "#C0C0C0",
            "#E0E0E0"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.23327318295547383,
            "mean_saturation": 49344342739427865e-22,
            "mean_warmth": -42551742919389977e-23
          }
        }
      },
      {
        "filmTitle": "Vortex",
        "sourcePage": "https://film-grab.com/2026/07/24/vortex/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Vortex_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#404040",
          "#202000",
          "#404020",
          "#606060",
          "#200000",
          "#808080"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#404040",
            "#202000",
            "#404020",
            "#606060",
            "#200000",
            "#808080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.1683629945363562,
            "mean_saturation": 0.16210749619146103,
            "mean_warmth": 0.012682546977124183
          }
        }
      },
      {
        "filmTitle": "Pulse",
        "sourcePage": "https://film-grab.com/2026/07/22/pulse/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Pulse_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#200000",
          "#202000",
          "#808080",
          "#606060",
          "#404040",
          "#404020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#200000",
            "#202000",
            "#808080",
            "#606060",
            "#404040",
            "#404020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.20702127110566448,
            "mean_saturation": 0.4281607183994393,
            "mean_warmth": 0.06733728213507624
          }
        }
      },
      {
        "filmTitle": "3 Godfathers",
        "sourcePage": "https://film-grab.com/2026/07/30/3-godfathers/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/3_Godfathers_09.jpg"
        ],
        "palette": [
          "#202020",
          "#604040",
          "#404040",
          "#402020",
          "#000000",
          "#606060",
          "#808080",
          "#406080"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#604040",
            "#404040",
            "#402020",
            "#000000",
            "#606060",
            "#808080",
            "#406080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.3022528209252451,
            "mean_saturation": 0.2468381247532267,
            "mean_warmth": 0.007518467456427019
          }
        }
      },
      {
        "filmTitle": "Body of Lies",
        "sourcePage": "https://film-grab.com/2026/08/03/body-of-lies/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Body_of_Lies_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#002020",
          "#202000",
          "#204040",
          "#E0E0E0",
          "#C0C0C0",
          "#404040"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#002020",
            "#202000",
            "#204040",
            "#E0E0E0",
            "#C0C0C0",
            "#404040"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.23757081597222218,
            "mean_saturation": 0.4758688873182305,
            "mean_warmth": 0.01846915849673203
          }
        }
      },
      {
        "filmTitle": "As In Heaven",
        "sourcePage": "https://film-grab.com/2026/08/09/as-in-heaven/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/As_In_Heaven_09.jpg"
        ],
        "palette": [
          "#404040",
          "#A08060",
          "#402020",
          "#202020",
          "#402000",
          "#C0C0C0",
          "#604040",
          "#002020"
        ],
        "analysis": {
          "palette": [
            "#404040",
            "#A08060",
            "#402020",
            "#202020",
            "#402000",
            "#C0C0C0",
            "#604040",
            "#002020"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Warm",
          "bias": "Amber / red bias",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.3617761617476851,
            "mean_saturation": 0.3757772188756561,
            "mean_warmth": 0.1270990774782135
          }
        }
      },
      {
        "filmTitle": "The Lady Vanishes",
        "sourcePage": "https://film-grab.com/2026/08/11/the-lady-vanishes/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lady_Vanishes_09.jpg"
        ],
        "palette": [
          "#202020",
          "#404040",
          "#606060",
          "#808080",
          "#000000",
          "#A0A0A0",
          "#C0C0C0",
          "#E0E0E0"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#404040",
            "#606060",
            "#808080",
            "#000000",
            "#A0A0A0",
            "#C0C0C0",
            "#E0E0E0"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.28207592933006537,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "State of Siege",
        "sourcePage": "https://film-grab.com/2026/08/15/state-of-siege/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/State_of_Siege_09.jpg"
        ],
        "palette": [
          "#206060",
          "#80A0A0",
          "#204040",
          "#408080",
          "#202020",
          "#002020",
          "#60A0A0",
          "#608080"
        ],
        "analysis": {
          "palette": [
            "#206060",
            "#80A0A0",
            "#204040",
            "#408080",
            "#202020",
            "#002020",
            "#60A0A0",
            "#608080"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Cool",
          "bias": "Blue / cyan bias",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.34721396097154134,
            "mean_saturation": 0.4682487991541832,
            "mean_warmth": -0.1438551028050109
          }
        }
      },
      {
        "filmTitle": "The Lost Boys",
        "sourcePage": "https://film-grab.com/2026/08/14/the-lost-boys/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Lost_Boys__09.jpg"
        ],
        "palette": [
          "#000000",
          "#200000",
          "#402000",
          "#202020",
          "#202000",
          "#402020",
          "#602000",
          "#400000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#200000",
            "#402000",
            "#202020",
            "#202000",
            "#402020",
            "#602000",
            "#400000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Rich / vivid",
          "contrast": "High density",
          "temperature": "Warm",
          "bias": "Amber / red bias",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.13341164028458607,
            "mean_saturation": 0.6217923122662582,
            "mean_warmth": 0.10308329929193899
          }
        }
      },
      {
        "filmTitle": "Them!",
        "sourcePage": "https://film-grab.com/2026/08/02/them/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Them_09.jpg"
        ],
        "palette": [
          "#202020",
          "#808080",
          "#000000",
          "#404040",
          "#A0A0A0",
          "#606060",
          "#C0C0C0",
          "#E0E0E0"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#808080",
            "#000000",
            "#404040",
            "#A0A0A0",
            "#606060",
            "#C0C0C0",
            "#E0E0E0"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.3137582550381264,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "The Call",
        "sourcePage": "https://film-grab.com/2026/07/31/the-call/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Call_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#204040",
          "#002020",
          "#000020",
          "#404040",
          "#202040",
          "#406080"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#204040",
            "#002020",
            "#000020",
            "#404040",
            "#202040",
            "#406080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Cool",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.1806326420377179,
            "mean_saturation": 0.46684177057578263,
            "mean_warmth": -0.08609281386165578
          }
        }
      },
      {
        "filmTitle": "A Generation",
        "sourcePage": "https://film-grab.com/2026/08/12/a-generation/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Generation_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#404040",
          "#606060",
          "#808080",
          "#A0A0A0",
          "#C0C0C0",
          "#000000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#404040",
            "#606060",
            "#808080",
            "#A0A0A0",
            "#C0C0C0",
            "#000000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.15193482775054468,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "Battle Beyond the Stars",
        "sourcePage": "https://film-grab.com/2026/08/04/battle-beyond-the-stars/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/BBTS_09.jpg"
        ],
        "palette": [
          "#000000",
          "#200000",
          "#202020",
          "#806060",
          "#402020",
          "#606060",
          "#002020",
          "#604040"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#200000",
            "#202020",
            "#806060",
            "#402020",
            "#606060",
            "#002020",
            "#604040"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Rich / vivid",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.1656980058551198,
            "mean_saturation": 0.4959612654016328,
            "mean_warmth": 0.008357162309368194
          }
        }
      },
      {
        "filmTitle": "Compa\xF1eros",
        "sourcePage": "https://film-grab.com/2026/07/26/companeros/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Companeros_09.jpg"
        ],
        "palette": [
          "#202020",
          "#404040",
          "#606060",
          "#404020",
          "#604040",
          "#C0A0A0",
          "#808080",
          "#402020"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#404040",
            "#606060",
            "#404020",
            "#604040",
            "#C0A0A0",
            "#808080",
            "#402020"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.37957336720452073,
            "mean_saturation": 0.22646700264271968,
            "mean_warmth": 0.04201814406318083
          }
        }
      },
      {
        "filmTitle": "The Novelist\u2019s Film",
        "sourcePage": "https://film-grab.com/2026/08/01/the-novelists-film/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Novelist's_Film_09.jpg"
        ],
        "palette": [
          "#808080",
          "#606060",
          "#202020",
          "#404040",
          "#A0A0A0",
          "#E0E0E0",
          "#FFFFFF",
          "#C0C0C0"
        ],
        "analysis": {
          "palette": [
            "#808080",
            "#606060",
            "#202020",
            "#404040",
            "#A0A0A0",
            "#E0E0E0",
            "#FFFFFF",
            "#C0C0C0"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Muted",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.4725643382352941,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "How To Blow Up A Pipeline",
        "sourcePage": "https://film-grab.com/2026/08/10/how-to-blow-up-a-pipeline/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/How_To_Blow_Up_a_Pipeline_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#402020",
          "#606040",
          "#404020",
          "#808060",
          "#404040",
          "#406040"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#402020",
            "#606040",
            "#404020",
            "#808060",
            "#404040",
            "#406040"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.2607165543300653,
            "mean_saturation": 0.3638746625900277,
            "mean_warmth": 0.02649782135076253
          }
        }
      },
      {
        "filmTitle": "Kingdom of Heaven",
        "sourcePage": "https://film-grab.com/2026/07/29/kingdom-of-heaven/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kingdom_of_Heaven_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#402020",
          "#200000",
          "#002020",
          "#004060",
          "#202000",
          "#2080A0"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#402020",
            "#200000",
            "#002020",
            "#004060",
            "#202000",
            "#2080A0"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.18100572686887254,
            "mean_saturation": 0.4788915716112982,
            "mean_warmth": -0.053790934776688455
          }
        }
      },
      {
        "filmTitle": "I Do Not Care If We Go Down In History As Barbarians",
        "sourcePage": "https://film-grab.com/2026/08/08/i-do-not-care-if-we-go-down-in-history-as-barbarians/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Barbarians_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#002020",
          "#204040",
          "#202000",
          "#404040",
          "#404020",
          "#406040"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#002020",
            "#204040",
            "#202000",
            "#404040",
            "#404020",
            "#406040"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.19023583963099128,
            "mean_saturation": 0.42647407699236733,
            "mean_warmth": 0.006283190359477124
          }
        }
      },
      {
        "filmTitle": "Highlander II: The Quickening",
        "sourcePage": "https://film-grab.com/2026/07/28/highlander-ii-the-quickening/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Highlander_2_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#200000",
          "#402020",
          "#202000",
          "#806040",
          "#C06040",
          "#402000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#200000",
            "#402020",
            "#202000",
            "#806040",
            "#C06040",
            "#402000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Warm",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.19740004493464053,
            "mean_saturation": 0.3896834996650091,
            "mean_warmth": 0.0905058551198257
          }
        }
      },
      {
        "filmTitle": "\u2018Round Midnight",
        "sourcePage": "https://film-grab.com/2026/08/16/round-midnight/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Round_Midnight_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202000",
          "#202020",
          "#200000",
          "#404020",
          "#404040",
          "#402020",
          "#402000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202000",
            "#202020",
            "#200000",
            "#404020",
            "#404040",
            "#402020",
            "#402000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.143951604711329,
            "mean_saturation": 0.4285470830661106,
            "mean_warmth": 0.04795411220043573
          }
        }
      },
      {
        "filmTitle": "The Tale of Princess Kaguya",
        "sourcePage": "https://film-grab.com/2026/08/13/the-tale-of-princess-kaguya/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Princess_Kaguya_09.jpg"
        ],
        "palette": [
          "#C0C0C0",
          "#E0E0E0",
          "#A0A0A0",
          "#808080",
          "#E0C0C0",
          "#C0E0C0",
          "#606060",
          "#A0C0A0"
        ],
        "analysis": {
          "palette": [
            "#C0C0C0",
            "#E0E0E0",
            "#A0A0A0",
            "#808080",
            "#E0C0C0",
            "#C0E0C0",
            "#606060",
            "#A0C0A0"
          ],
          "exposure": "Bright / lifted",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.6932124628948801,
            "mean_saturation": 0.10229232569483446,
            "mean_warmth": 0.013485498366013073
          }
        }
      },
      {
        "filmTitle": "A Day At The Races",
        "sourcePage": "https://film-grab.com/2026/07/30/a-day-at-the-races/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Day_At_The_Races_09.jpg"
        ],
        "palette": [
          "#404040",
          "#606060",
          "#808080",
          "#202020",
          "#A0A0A0",
          "#C0C0C0",
          "#000000",
          "#E0E0E0"
        ],
        "analysis": {
          "palette": [
            "#404040",
            "#606060",
            "#808080",
            "#202020",
            "#A0A0A0",
            "#C0C0C0",
            "#000000",
            "#E0E0E0"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Muted",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.3711039624183006,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "Benediction",
        "sourcePage": "https://film-grab.com/2026/08/07/benediction/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Benediction_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#202000",
          "#200000",
          "#404040",
          "#402020",
          "#E0E0E0",
          "#604020"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#202000",
            "#200000",
            "#404040",
            "#402020",
            "#E0E0E0",
            "#604020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.24016620829929192,
            "mean_saturation": 0.3434075151250696,
            "mean_warmth": 0.04366574754901961
          }
        }
      },
      {
        "filmTitle": "Our Father, The Devil",
        "sourcePage": "https://film-grab.com/2026/07/12/our-father-the-devil/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Our_Father_The_Devil_09.jpg"
        ],
        "palette": [
          "#202020",
          "#E0E0E0",
          "#404040",
          "#402020",
          "#606040",
          "#000000",
          "#606060",
          "#200000"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#E0E0E0",
            "#404040",
            "#402020",
            "#606040",
            "#000000",
            "#606060",
            "#200000"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.3764628653492647,
            "mean_saturation": 0.3074662144239901,
            "mean_warmth": 0.0541781556372549
          }
        }
      },
      {
        "filmTitle": "Heroic Trio 2: Executioners",
        "sourcePage": "https://film-grab.com/2026/07/08/heroic-trio-2-executioners/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Executioners_09.jpg"
        ],
        "palette": [
          "#202020",
          "#204040",
          "#002020",
          "#000000",
          "#402020",
          "#404020",
          "#002000",
          "#204060"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#204040",
            "#002020",
            "#000000",
            "#402020",
            "#404020",
            "#002000",
            "#204060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Rich / vivid",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.21061675628063725,
            "mean_saturation": 0.49151703182399664,
            "mean_warmth": -0.015640744144880172
          }
        }
      },
      {
        "filmTitle": "The Reckless Moment",
        "sourcePage": "https://film-grab.com/2026/07/25/the-reckless-moment/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Reckless_Moment_09.jpg"
        ],
        "palette": [
          "#404040",
          "#202020",
          "#606060",
          "#808080",
          "#000000",
          "#A0A0A0",
          "#C0C0C0",
          "#E0E0E0"
        ],
        "analysis": {
          "palette": [
            "#404040",
            "#202020",
            "#606060",
            "#808080",
            "#000000",
            "#A0A0A0",
            "#C0C0C0",
            "#E0E0E0"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.31085707720588235,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "Matchstick Men",
        "sourcePage": "https://film-grab.com/2026/07/02/matchstick-men/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Matchstick_Men_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#404040",
          "#E0FFFF",
          "#202000",
          "#404020",
          "#608080",
          "#002020"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#404040",
            "#E0FFFF",
            "#202000",
            "#404020",
            "#608080",
            "#002020"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.40925637212350213,
            "mean_saturation": 0.301620069810484,
            "mean_warmth": -0.015493515114379087
          }
        }
      },
      {
        "filmTitle": "Maggie Moore(s)",
        "sourcePage": "https://film-grab.com/2026/07/04/maggie-moores/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Maggie_Moores_09.jpg"
        ],
        "palette": [
          "#202020",
          "#404020",
          "#202000",
          "#000000",
          "#402020",
          "#404040",
          "#200000",
          "#606040"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#404020",
            "#202000",
            "#000000",
            "#402020",
            "#404040",
            "#200000",
            "#606040"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.16715594005310455,
            "mean_saturation": 0.4380010712046518,
            "mean_warmth": 0.07907220179738562
          }
        }
      },
      {
        "filmTitle": "The Host",
        "sourcePage": "https://film-grab.com/2026/07/10/the-host/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Host_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#204040",
          "#406060",
          "#404040",
          "#002020",
          "#404060",
          "#606060"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#204040",
            "#406060",
            "#404040",
            "#002020",
            "#404060",
            "#606060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.24583906547862203,
            "mean_saturation": 0.33365689236309326,
            "mean_warmth": -0.01750536151960784
          }
        }
      },
      {
        "filmTitle": "Water For Elephants",
        "sourcePage": "https://film-grab.com/2026/07/08/water-for-elephants/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Water_For_Elephants_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#002020",
          "#200000",
          "#202000",
          "#404040",
          "#000020",
          "#404020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#002020",
            "#200000",
            "#202000",
            "#404040",
            "#000020",
            "#404020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.1809484669458061,
            "mean_saturation": 0.4242178435733232,
            "mean_warmth": 0.02627229711328976
          }
        }
      },
      {
        "filmTitle": "The Little Mermaid",
        "sourcePage": "https://film-grab.com/2026/07/06/the-little-mermaid/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Little_Mermaid_09.jpg"
        ],
        "palette": [
          "#002020",
          "#000000",
          "#000020",
          "#204040",
          "#202020",
          "#404040",
          "#002040",
          "#406060"
        ],
        "analysis": {
          "palette": [
            "#002020",
            "#000000",
            "#000020",
            "#204040",
            "#202020",
            "#404040",
            "#002040",
            "#406060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Rich / vivid",
          "contrast": "High density",
          "temperature": "Cool",
          "bias": "Blue / cyan bias",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.2723061041326253,
            "mean_saturation": 0.520314486752837,
            "mean_warmth": -0.12271497140522875
          }
        }
      },
      {
        "filmTitle": "Last Action Hero",
        "sourcePage": "https://film-grab.com/2026/07/16/last-action-hero/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Action_Hero_09.jpg"
        ],
        "palette": [
          "#000000",
          "#200000",
          "#202020",
          "#402020",
          "#404040",
          "#604040",
          "#606060",
          "#202000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#200000",
            "#202020",
            "#402020",
            "#404040",
            "#604040",
            "#606060",
            "#202000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.1846696015454793,
            "mean_saturation": 0.4131349762988366,
            "mean_warmth": 0.014791836873638343
          }
        }
      },
      {
        "filmTitle": "Rosalie",
        "sourcePage": "https://film-grab.com/2026/07/15/rosalie/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Rosalie_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#200000",
          "#808080",
          "#404040",
          "#204020",
          "#404020",
          "#606060"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#200000",
            "#808080",
            "#404040",
            "#204020",
            "#404020",
            "#606060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.29601764025054467,
            "mean_saturation": 0.35425692238971307,
            "mean_warmth": 0.0237234477124183
          }
        }
      },
      {
        "filmTitle": "Kiss of Death",
        "sourcePage": "https://film-grab.com/2026/07/05/kiss-of-death/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Kiss_of_Death_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#404040",
          "#606060",
          "#808080",
          "#A0A0A0",
          "#C0C0C0",
          "#000000"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#404040",
            "#606060",
            "#808080",
            "#A0A0A0",
            "#C0C0C0",
            "#000000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.18765744144880175,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "King of New York",
        "sourcePage": "https://film-grab.com/2026/07/14/king-of-new-york/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_King_Of_New_York_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#200000",
          "#404040",
          "#202040",
          "#402020",
          "#204040",
          "#606060"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#200000",
            "#404040",
            "#202040",
            "#402020",
            "#204040",
            "#606060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.14066769327001633,
            "mean_saturation": 0.4473129066916131,
            "mean_warmth": -0.0037066823257080606
          }
        }
      },
      {
        "filmTitle": "Master Gardener",
        "sourcePage": "https://film-grab.com/2026/07/03/master-gardener/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Master_Gardener_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#404040",
          "#404020",
          "#606060",
          "#202000",
          "#606040",
          "#204020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#404040",
            "#404020",
            "#606060",
            "#202000",
            "#606040",
            "#204020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.18489392463235296,
            "mean_saturation": 0.31473399021777343,
            "mean_warmth": 0.023949822984749458
          }
        }
      },
      {
        "filmTitle": "The Big 4",
        "sourcePage": "https://film-grab.com/2026/07/20/the-big-4/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Big_Four_09.jpg"
        ],
        "palette": [
          "#202020",
          "#404040",
          "#000000",
          "#606060",
          "#204040",
          "#002020",
          "#202040",
          "#808080"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#404040",
            "#000000",
            "#606060",
            "#204040",
            "#002020",
            "#202040",
            "#808080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.26878930240672655,
            "mean_saturation": 0.30432612970343653,
            "mean_warmth": -0.03104702818627451
          }
        }
      },
      {
        "filmTitle": "Your Name.",
        "sourcePage": "https://film-grab.com/2026/07/13/your-name/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_09.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Your_Name_10.jpg"
        ],
        "palette": [
          "#FFFFFF",
          "#4060A0",
          "#404040",
          "#E0E0E0",
          "#6080A0",
          "#FFE0FF",
          "#202040",
          "#E0E0FF"
        ],
        "analysis": {
          "palette": [
            "#FFFFFF",
            "#4060A0",
            "#404040",
            "#E0E0E0",
            "#6080A0",
            "#FFE0FF",
            "#202040",
            "#E0E0FF"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Cool",
          "bias": "Blue / cyan bias",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.5793760572406046,
            "mean_saturation": 0.26911241495508825,
            "mean_warmth": -0.10051359953703703
          }
        }
      },
      {
        "filmTitle": "El Cid",
        "sourcePage": "https://film-grab.com/2026/07/23/el-cid/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/El_Cid_09.jpg"
        ],
        "palette": [
          "#404040",
          "#202020",
          "#000000",
          "#A08080",
          "#604040",
          "#806060",
          "#606060",
          "#402020"
        ],
        "analysis": {
          "palette": [
            "#404040",
            "#202020",
            "#000000",
            "#A08080",
            "#604040",
            "#806060",
            "#606060",
            "#402020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.2853145700571895,
            "mean_saturation": 0.3013075308011569,
            "mean_warmth": 0.0710597086056645
          }
        }
      },
      {
        "filmTitle": "The Decameron",
        "sourcePage": "https://film-grab.com/2026/07/21/the-decameron/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Decameron_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#404040",
          "#402020",
          "#202040",
          "#200000",
          "#000020",
          "#606060"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#404040",
            "#402020",
            "#202040",
            "#200000",
            "#000020",
            "#606060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.26520455005787036,
            "mean_saturation": 0.3796473628391316,
            "mean_warmth": -0.03078065427559913
          }
        }
      },
      {
        "filmTitle": "The Last of Sheila",
        "sourcePage": "https://film-grab.com/2026/07/19/the-last-of-sheila/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Last_Of_Sheila_09.jpg"
        ],
        "palette": [
          "#000000",
          "#404040",
          "#202020",
          "#606060",
          "#200000",
          "#402020",
          "#604040",
          "#808080"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#404040",
            "#202020",
            "#606060",
            "#200000",
            "#402020",
            "#604040",
            "#808080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.22232480392156864,
            "mean_saturation": 0.29886155673672626,
            "mean_warmth": 0.015022467320261437
          }
        }
      },
      {
        "filmTitle": "My Sole Desire",
        "sourcePage": "https://film-grab.com/2026/07/18/my-sole-desire/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/My_Sole_Desire_09.jpg"
        ],
        "palette": [
          "#000000",
          "#000020",
          "#002020",
          "#402020",
          "#202020",
          "#002040",
          "#200000",
          "#204040"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#000020",
            "#002020",
            "#402020",
            "#202020",
            "#002040",
            "#200000",
            "#204040"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Rich / vivid",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.1328852662037037,
            "mean_saturation": 0.6310175892011426,
            "mean_warmth": -0.06411356209150326
          }
        }
      },
      {
        "filmTitle": "Tommy",
        "sourcePage": "https://film-grab.com/2026/07/01/tommy/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Tommy__09.jpg"
        ],
        "palette": [
          "#000000",
          "#404040",
          "#202020",
          "#404020",
          "#606040",
          "#606060",
          "#808080",
          "#808060"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#404040",
            "#202020",
            "#404020",
            "#606040",
            "#606060",
            "#808080",
            "#808060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.24186226707175923,
            "mean_saturation": 0.35071330680234997,
            "mean_warmth": 0.027628421160130714
          }
        }
      },
      {
        "filmTitle": "Anon",
        "sourcePage": "https://film-grab.com/2026/06/30/anon/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Anon_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#606060",
          "#404040",
          "#000020",
          "#202040",
          "#002020",
          "#808080"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#606060",
            "#404040",
            "#000020",
            "#202040",
            "#002020",
            "#808080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.17585782781862747,
            "mean_saturation": 0.26770757880025126,
            "mean_warmth": -0.02035845588235294
          }
        }
      },
      {
        "filmTitle": "The Mountain (1956)",
        "sourcePage": "https://film-grab.com/2026/07/11/the-mountain-1956/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Mountain_09.jpg"
        ],
        "palette": [
          "#202020",
          "#204060",
          "#404040",
          "#000000",
          "#202040",
          "#002040",
          "#604040",
          "#404020"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#204060",
            "#404040",
            "#000000",
            "#202040",
            "#002040",
            "#604040",
            "#404020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.267451577222903,
            "mean_saturation": 0.39520124887484287,
            "mean_warmth": -0.03792764501633987
          }
        }
      },
      {
        "filmTitle": "The Dark Mirror",
        "sourcePage": "https://film-grab.com/2026/06/27/the-dark-mirror/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Dark_Mirror_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#404040",
          "#606060",
          "#808080",
          "#A0A0A0",
          "#C0C0C0",
          "#000000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#404040",
            "#606060",
            "#808080",
            "#A0A0A0",
            "#C0C0C0",
            "#000000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.18449712350217864,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "Never Look Away",
        "sourcePage": "https://film-grab.com/2026/06/15/never-look-away/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Never_Look_Away_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#002020",
          "#808080",
          "#404040",
          "#606060",
          "#608060",
          "#404020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#002020",
            "#808080",
            "#404040",
            "#606060",
            "#608060",
            "#404020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.19096736264297387,
            "mean_saturation": 0.4572509895765524,
            "mean_warmth": -0.005440665849673201
          }
        }
      },
      {
        "filmTitle": "Once A Thief",
        "sourcePage": "https://film-grab.com/2026/06/02/once-a-thief/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Once_A_Thief_09.jpg"
        ],
        "palette": [
          "#404040",
          "#202020",
          "#404020",
          "#808080",
          "#606060",
          "#000000",
          "#A0A0A0",
          "#C0C0C0"
        ],
        "analysis": {
          "palette": [
            "#404040",
            "#202020",
            "#404020",
            "#808080",
            "#606060",
            "#000000",
            "#A0A0A0",
            "#C0C0C0"
          ],
          "exposure": "Balanced / natural",
          "saturation": "Moderate",
          "contrast": "Soft / controlled",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Cinematic / restrained",
          "raw_metrics": {
            "mean_luma": 0.3781022700503812,
            "mean_saturation": 0.23235344809049666,
            "mean_warmth": 0.021870744825708062
          }
        }
      },
      {
        "filmTitle": "The Goldfinch",
        "sourcePage": "https://film-grab.com/2026/06/19/the-goldfinch/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/The_Goldfinch_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#202000",
          "#404040",
          "#402020",
          "#404020",
          "#002020",
          "#200000"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#202000",
            "#404040",
            "#402020",
            "#404020",
            "#002020",
            "#200000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.17234924947235838,
            "mean_saturation": 0.3173156195006852,
            "mean_warmth": 0.028231804874727668
          }
        }
      },
      {
        "filmTitle": "Black Panther: Wakanda Forever",
        "sourcePage": "https://film-grab.com/2026/06/26/black-panther-wakanda-forever/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Black_Panther_Wakanda_Forever_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#002020",
          "#806040",
          "#204040",
          "#202000",
          "#402020",
          "#808080"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#002020",
            "#806040",
            "#204040",
            "#202000",
            "#402020",
            "#808080"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.29296691270084424,
            "mean_saturation": 0.40049050048688994,
            "mean_warmth": 0.013091043709150327
          }
        }
      },
      {
        "filmTitle": "Outland",
        "sourcePage": "https://film-grab.com/2026/06/09/outland/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Outland_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#606060",
          "#404040",
          "#808080",
          "#200000",
          "#806060",
          "#402020"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#606060",
            "#404040",
            "#808080",
            "#200000",
            "#806060",
            "#402020"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.2149579716435185,
            "mean_saturation": 0.3685526102876138,
            "mean_warmth": 0.032949516612200434
          }
        }
      },
      {
        "filmTitle": "Corsage",
        "sourcePage": "https://film-grab.com/2026/06/17/corsage/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Corsage_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#406040",
          "#204040",
          "#404040",
          "#200000",
          "#002020",
          "#202000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#406040",
            "#204040",
            "#404040",
            "#200000",
            "#002020",
            "#202000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.19549210920479304,
            "mean_saturation": 0.4510934166981011,
            "mean_warmth": -0.019934640522875816
          }
        }
      },
      {
        "filmTitle": "In Time",
        "sourcePage": "https://film-grab.com/2026/06/22/in-time/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/In_Time_09.jpg"
        ],
        "palette": [
          "#000000",
          "#202020",
          "#002000",
          "#404040",
          "#404020",
          "#200000",
          "#604040",
          "#202000"
        ],
        "analysis": {
          "palette": [
            "#000000",
            "#202020",
            "#002000",
            "#404040",
            "#404020",
            "#200000",
            "#604040",
            "#202000"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.20347247719226577,
            "mean_saturation": 0.40070519195568266,
            "mean_warmth": 0.02681610838779956
          }
        }
      },
      {
        "filmTitle": "A Man Escaped",
        "sourcePage": "https://film-grab.com/2026/06/18/a-man-escaped/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/A_Man_Escaped_09.jpg"
        ],
        "palette": [
          "#202020",
          "#000000",
          "#606060",
          "#404040",
          "#808080",
          "#A0A0A0",
          "#C0C0C0",
          "#E0E0E0"
        ],
        "analysis": {
          "palette": [
            "#202020",
            "#000000",
            "#606060",
            "#404040",
            "#808080",
            "#A0A0A0",
            "#C0C0C0",
            "#E0E0E0"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Muted",
          "contrast": "High density",
          "temperature": "Neutral",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.22926028050108935,
            "mean_saturation": 0,
            "mean_warmth": 0
          }
        }
      },
      {
        "filmTitle": "Bad Luck Banging or Loony Porn",
        "sourcePage": "https://film-grab.com/2026/05/30/bad-luck-banging-or-loony-porn/",
        "imageUrls": [
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_01.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_02.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_03.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_04.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_05.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_06.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_07.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_08.jpg",
          "https://film-grab.com/wp-content/uploads/photo-gallery/Bad_Luck_Banging_09.jpg"
        ],
        "palette": [
          "#404040",
          "#202020",
          "#606040",
          "#402020",
          "#000000",
          "#404020",
          "#808060",
          "#A08060"
        ],
        "analysis": {
          "palette": [
            "#404040",
            "#202020",
            "#606040",
            "#402020",
            "#000000",
            "#404020",
            "#808060",
            "#A08060"
          ],
          "exposure": "Low-key / underexposed",
          "saturation": "Moderate",
          "contrast": "High density",
          "temperature": "Warm",
          "bias": "Balanced chroma",
          "mood": "Nocturnal / introspective",
          "raw_metrics": {
            "mean_luma": 0.29168216043709155,
            "mean_saturation": 0.3664189113017241,
            "mean_warmth": 0.09029394744008715
          }
        }
      }
    ];
  }
});

// server/filmGrabRemote.ts
var filmGrabRemote_exports = {};
__export(filmGrabRemote_exports, {
  syncLatestFilmGrab: () => syncLatestFilmGrab
});
import sharp from "sharp";
function decodeHtml(value) {
  return value.replace(/&#8217;|&#x2019;/g, "\u2019").replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/<[^>]+>/g, "").trim();
}
function titleFromHtml(html, sourcePage) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml(match?.[1] || sourcePage.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Untitled Film").replace(/\s+[-|].*$/, "");
}
async function analyzeRemoteImages(imageUrls) {
  const buckets = /* @__PURE__ */ new Map();
  let count = 0;
  let luma = 0;
  let saturation = 0;
  let warmth = 0;
  for (const url of imageUrls.slice(0, 9)) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Visual-Sheet-Lab/1.0" } });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const { data, info } = await sharp(buffer).resize(48, 48, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let index = 0; index < data.length; index += info.channels) {
        const [r, g, b] = [data[index], data[index + 1], data[index + 2]];
        const key = `#${[r, g, b].map((value) => Math.min(255, Math.round(value / 32) * 32).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
        buckets.set(key, (buckets.get(key) || 0) + 1);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        luma += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        saturation += max ? (max - min) / max : 0;
        warmth += (r - b) / 255;
        count += 1;
      }
    } catch {
    }
  }
  const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex]) => hex);
  const averageLuma = luma / Math.max(count, 1);
  const averageSaturation = saturation / Math.max(count, 1);
  const averageWarmth = warmth / Math.max(count, 1);
  return {
    palette: sorted.length ? sorted : ["#222222", "#444444", "#666666", "#888888", "#AAAAAA", "#CCCCCC", "#DDDDDD", "#EEEEEE"],
    mood: averageLuma < 0.35 ? "Nocturnal / introspective" : averageSaturation > 0.45 ? "Energetic / saturated" : "Cinematic / restrained",
    exposure: averageLuma < 0.32 ? "Low-key / underexposed" : averageLuma > 0.68 ? "Bright / lifted" : "Balanced / natural",
    saturation: averageSaturation < 0.2 ? "Muted" : averageSaturation > 0.48 ? "Rich / vivid" : "Moderate",
    contrast: averageLuma < 0.32 || averageLuma > 0.68 ? "High density" : "Soft / controlled",
    temperature: averageWarmth > 0.08 ? "Warm" : averageWarmth < -0.08 ? "Cool" : "Neutral",
    bias: averageWarmth > 0.1 ? "Amber / red bias" : averageWarmth < -0.1 ? "Blue / cyan bias" : "Balanced chroma",
    raw_metrics: { averageLuma, averageSaturation, averageWarmth }
  };
}
async function parseLatestFilms(limit = 12) {
  const home = await (await fetch(FILM_GRAB_HOME, { headers: { "user-agent": "Visual-Sheet-Lab/1.0" } })).text();
  const pages = Array.from(new Set(home.match(POST_LINK) || [])).slice(0, limit);
  const results = [];
  for (const sourcePage of pages) {
    try {
      const html = await (await fetch(sourcePage, { headers: { "user-agent": "Visual-Sheet-Lab/1.0" } })).text();
      const imageUrls = Array.from(new Set((html.match(IMAGE_LINK) || []).map((url) => url.replace(/&amp;/g, "&").replace(/\\u0026/g, "&")))).slice(0, 9);
      if (imageUrls.length) results.push({ filmTitle: titleFromHtml(html, sourcePage), sourcePage, imageUrls });
    } catch {
    }
  }
  return results;
}
async function syncLatestFilmGrab(limit = 12) {
  const latest = await parseLatestFilms(limit);
  let synced = 0;
  for (const item of latest) {
    const existing = filmGrabSeed.find((seed) => seed.sourcePage === item.sourcePage || seed.filmTitle.toLowerCase() === item.filmTitle.toLowerCase());
    const analysis = existing?.analysis || await analyzeRemoteImages(item.imageUrls);
    const palette = existing?.palette || analysis.palette;
    await upsertFilmGrabBenchmark({ filmTitle: item.filmTitle, sourcePage: item.sourcePage, imageUrls: JSON.stringify(item.imageUrls), palette: JSON.stringify(palette), analysis: JSON.stringify(analysis), sourceUpdatedAt: /* @__PURE__ */ new Date() });
    synced += 1;
  }
  return { synced, discovered: latest.length, source: FILM_GRAB_HOME, syncedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
var FILM_GRAB_HOME, POST_LINK, IMAGE_LINK;
var init_filmGrabRemote = __esm({
  "server/filmGrabRemote.ts"() {
    "use strict";
    init_filmGrabSeed();
    init_db();
    FILM_GRAB_HOME = "https://film-grab.com/";
    POST_LINK = /https:\/\/film-grab\.com\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/?/g;
    IMAGE_LINK = /https?:\/\/film-grab\.com\/wp-content\/uploads\/[^\"'<>\\s]+/g;
  }
});

// api/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_db();

// shared/sheetRules.ts
var strengthDirection = {
  Subtle: "subtle cinematic realism",
  Strong: "strong filmic continuity look",
  Heavy: "heavy muted arthouse film look"
};
var lockDirection = {
  shoes: "shoes clearly visible in full-body frames",
  back: "back full-body view with neck posture and shoulder silhouette",
  hands: "hand detail frame: veins, skin texture, natural tension",
  lenses: "lens variance: 28mm wide / 35mm observational / 50mm natural / 85mm close-up",
  mannequin: "no mannequin posture \u2014 natural weight imbalance and imperfect stance",
  variation: "continuity consistency not cloning \u2014 subtle natural variation allowed"
};
var realismProtection = `Hidden Character Realism Protection:
preserve asymmetry; preserve natural facial imbalance; preserve skin irregularities; preserve visible natural pores; preserve fine skin texture; preserve uneven skin tone; preserve subtle facial imperfections; preserve realistic age-appropriate skin texture; preserve natural under-eye shadows; preserve slight redness, blemishes, pores, small wrinkles, and normal skin variation; skin must look tactile and human, not polished or cosmetic; retain ordinary human appearance; maintain facial structure from reference.`;
var avoidDirection = "concept art style, game character sheets, fashion editorial lighting, AI-perfect skin, plastic texture, mannequin posture, white seamless backgrounds, hard rim lighting, heavy HDR grading, beauty retouching, commercial beauty photography, influencer aesthetics, plastic skin, waxy skin, porcelain skin, airbrushed skin, symmetrical face enhancement, beautified facial proportions, skin smoothing, skin softening, pore removal, perfect clean skin, cosmetic ad skin, glamour photography, beauty filter";
var platformDirection = {
  Universal: { instruction: "Use natural-language visual-production instructions that can be adapted across image models.", suffix: "" },
  GPT: { instruction: "Write as a structured GPT image-generation instruction: prioritize explicit subject, composition, camera, lighting, continuity and exclusions in readable natural language.", suffix: "" },
  Midjourney: { instruction: "Write as a Midjourney-ready cinematic prompt with concise visual clauses, explicit camera language and a clean parameter tail.", suffix: " --ar 4:5 --stylize 100" }
};
function buildCharacterPrompt(fields, platform, strength, locks2) {
  const value = (key, fallback) => fields[key]?.trim() || fallback;
  const direction = strengthDirection[strength] ?? strengthDirection.Strong;
  const platformRule = platformDirection[platform] ?? platformDirection.Universal;
  const activeLocks = Object.entries(locks2).filter(([, enabled]) => enabled).map(([key]) => lockDirection[key] ?? key);
  const lockBlock = activeLocks.length ? activeLocks.map((item) => `\u2022 ${item}`).join("\n") : "\u2022 preserve natural continuity and human imperfection";
  const header = `[FREE CHARACTER SHEET PROMPT \u2014 ${platform}]`;
  const important = `IMPORTANT:
This is a free character-sheet generator.
If the character description or any input field is written in Korean, first translate the meaning internally into precise English visual-production language before generating the image. Do not ignore Korean text. Preserve the user's intended facial structure, posture, wardrobe, age, nationality, and emotional quality. Empty fields mean: infer naturally from the provided character description without changing the core identity.
Use only the provided character information and infer missing details naturally.
Prioritize facial structure, hair logic, body posture, wardrobe continuity, and human imperfection over mood-only styling.
The goal is not a fashion editorial. The goal is a usable AI character sheet for later scene generation.`;
  const context = `Character Description:
"${value("description", "a grounded cinematic protagonist with a distinctive but believable face")}"

Context:
- Period / Country: ${value("period", "infer naturally")}.
- Role / Background: ${value("role", "infer naturally")}.
- Emotion / Personality: ${value("emotion", "quietly observant, emotionally restrained")}.
- Body / Posture: ${value("body", "natural weight imbalance and relaxed posture")}.
- Wardrobe: ${value("wardrobe", "coherent wardrobe inferred from the character")}.`;
  const board = `Board Structure:
1. IDENTITY ZONE
- front full-body view
- left profile
- right profile in a natural walking pose
- clear back full-body view

2. CINEMATIC HUMAN ZONE
- mid-length shots
- subtle emotional states
- natural interaction poses
- candid documentary feeling

3. PRODUCTION CONTINUITY ZONE
- face texture close-up
- eye / nose / lips detail
- hand detail
- wardrobe texture
- shoes and accessories`;
  const style = `Visual Style:
${direction}.
35mm motion picture film.
Natural spherical lenses.
Practical, naturalistic lighting only.
Muted grey-beige palette.
Low-key exposure density.
Natural skin texture, visible pores, subtle imperfections.`;
  const full = `${header}

Create a photorealistic cinematic actor continuity board based on the following character description.

${platformRule.instruction}

${important}

${context}

${board}

${style}

Locks:
${lockBlock}

${realismProtection}

Avoid:
${avoidDirection}${platformRule.suffix}`;
  const compact = `${header}
${platformRule.instruction} Create a photorealistic ${direction} character continuity board. Character: ${value("description", "a grounded cinematic protagonist with a distinctive but believable face")}. Context: ${value("period", "infer naturally")}; ${value("role", "infer naturally")}; ${value("emotion", "quietly observant, emotionally restrained")}; ${value("body", "natural weight imbalance and relaxed posture")}; Wardrobe: ${value("wardrobe", "coherent wardrobe inferred from the character")}. Include front/profile/back identity views, cinematic human interaction frames, and production detail zones for face, hands, wardrobe and shoes. Practical 35mm film lighting, muted grey-beige palette, natural pores and asymmetry. Locks: ${activeLocks.join(", ") || "natural human imperfection"}.`;
  const negative = `${avoidDirection}${platform === "Midjourney" ? ", --no plastic skin, beauty filter, mannequin pose" : ""}`;
  return { full, compact, negative };
}

// server/characterPromptSeed.ts
var baseFields = {
  description: "\uC2E4\uC81C \uCC38\uACE0 \uC0AC\uC9C4\uACFC \uAE30\uC874 \uCE90\uB9AD\uD130 \uC2DC\uD2B8\uC758 \uC5BC\uAD74 \uC815\uCCB4\uC131\uC744 \uC815\uD655\uD788 \uC720\uC9C0\uD55C 60\uB300 \uC911\uD6C4\uBC18 \uD55C\uAD6D \uB0A8\uC131. \uC57D\uAC04 \uB113\uACE0 \uC9C1\uC0AC\uAC01\uD615\uC5D0 \uAC00\uAE4C\uC6B4 \uD0C0\uC6D0\uD615 \uC5BC\uAD74, \uB2E8\uB2E8\uD558\uC9C0\uB9CC \uACFC\uB3C4\uD558\uAC8C \uAC01\uC9C0\uC9C0 \uC54A\uC740 \uD131\uC120, \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB113\uC740 \uAD11\uB300\uC640 \uBCFC, \uC9E7\uACE0 \uB2E8\uC815\uD55C \uAC80\uC740 \uBA38\uB9AC\uC640 \uC57D\uAC04\uC758 \uD68C\uC0C9 \uBAA8\uBC1C, \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uCE21\uBA74 \uAC00\uB974\uB9C8. \uBE44\uAD50\uC801 \uACE7\uC740 \uB208\uC379, \uC57D\uAC04 \uAC00\uB298\uACE0 \uCC28\uBD84\uD55C \uC9D9\uC740 \uB208, \uB208\uAEBC\uD480\uC758 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uB178\uD654, \uB113\uACE0 \uB465\uADFC \uCF54\uB05D, \uC587\uACE0 \uC808\uC81C\uB41C \uC785\uC220. \uC6C3\uC9C0 \uC54A\uC744 \uB54C\uB294 \uC2E0\uC911\uD558\uACE0 \uCC45\uC784\uAC10 \uC788\uC5B4 \uBCF4\uC774\uC9C0\uB9CC, \uC190\uC790\uB97C \uBCFC \uB54C\uC5D0\uB294 \uB208\uAC00\uC640 \uC785\uAC00\uAC00 \uBD80\uB4DC\uB7FD\uAC8C \uD480\uB9B0\uB2E4. 2~3\uC138 \uC190\uC790\uB97C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB3CC\uBCF4\uB294 \uD560\uC544\uBC84\uC9C0\uC774\uBA70, \uC2E0\uBC1C\uC744 \uC2E0\uACA8\uC8FC\uAC70\uB098 \uB4F1\uC5D0 \uC5C5\uB294 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC0C1\uD638\uC791\uC6A9\uC744 \uD3EC\uD568\uD55C\uB2E4. \uC190\uACFC \uD314\uC774 \uC544\uC774\uC758 \uBAB8\uC744 \uB6AB\uAC70\uB098 \uACB9\uCE58\uC9C0 \uC54A\uC544\uC57C \uD55C\uB2E4.",
  period: "2020\uB144\uB300 \uB300\uD55C\uBBFC\uAD6D. \uD604\uB300 \uD55C\uAD6D\uC758 \uAC00\uC815\uACFC \uAC00\uC871 \uBAA8\uC784.",
  role: "\uAC00\uC871 \uC548\uC5D0\uC11C \uCC45\uC784\uAC10 \uC788\uB294 \uD615\uC774\uC790 2~3\uC138 \uC190\uC790\uB97C \uB454 \uD560\uC544\uBC84\uC9C0. \uC2E4\uC81C \uC9C1\uC5C5\uC740 \uACE0\uC815\uD558\uC9C0 \uC54A\uB294\uB2E4.",
  emotion: "\uCC45\uC784\uAC10 \uC788\uACE0 \uB9D0\uC218\uAC00 \uB9CE\uC9C0 \uC54A\uC73C\uBA70 \uAC00\uC871\uC744 \uD589\uB3D9\uC73C\uB85C \uCC59\uAE34\uB2E4. \uC190\uC790\uC5D0\uAC8C\uB294 \uC775\uC219\uD558\uACE0 \uB2E4\uC815\uD558\uBA70, \uC190\uC790\uB97C \uBC14\uB77C\uBCFC \uB54C\uB9CC \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uBBF8\uC18C\uAC00 \uC0DD\uAE34\uB2E4.",
  body: "\uBCF4\uD1B5 \uD0A4\uC758 \uB2E8\uB2E8\uD55C \uC911\uB144 \uC774\uD6C4 \uB0A8\uC131 \uCCB4\uD615. \uC5B4\uAE68\uAC00 \uBC18\uB4EF\uD558\uACE0 \uC911\uC2EC\uC774 \uC548\uC815\uC801\uC774\uBA70, \uB3CC\uBCFC \uB54C \uBB34\uB98E\uC744 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uAD7D\uD78C\uB2E4.",
  wardrobe: "\uC9D9\uC740 \uB124\uC774\uBE44 \uD22C \uBC84\uD2BC \uC815\uC7A5, \uD770\uC0C9 \uB4DC\uB808\uC2A4 \uC154\uCE20, \uCC44\uB3C4\uAC00 \uB0AE\uC740 \uC911\uAC04 \uCCAD\uC0C9 \uB125\uD0C0\uC774, \uD770\uC0C9 \uD3EC\uCF13\uC2A4\uD018\uC5B4, \uAC80\uC740\uC0C9 \uAC00\uC8FD \uC815\uC7A5 \uAD6C\uB450. \uB85C\uACE0\uB098 \uC77D\uC744 \uC218 \uC788\uB294 \uBB38\uAD6C\uB294 \uC5C6\uB2E4."
};
var locks = { shoes: true, back: true, hands: true, lenses: true, mannequin: true, variation: true };
var characterPromptSeed = [
  { caseName: "attached-universal-strong", platform: "Universal", strength: "Strong", fields: baseFields, locks, sourceLabel: "user attachment: Strong Filmic Continuity" },
  { caseName: "attached-universal-subtle", platform: "Universal", strength: "Subtle", fields: baseFields, locks, sourceLabel: "user attachment: Subtle Cinematic Realism" },
  { caseName: "attached-universal-heavy", platform: "Universal", strength: "Heavy", fields: baseFields, locks, sourceLabel: "user attachment: Heavy Muted Arthouse" }
].map((item) => ({ ...item, outputs: buildCharacterPrompt(item.fields, item.platform, item.strength, item.locks) }));

// server/routers.ts
init_filmGrabSeed();
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  filmGrab: router({
    list: publicProcedure.query(async () => {
      const rows = await listFilmGrabBenchmarks();
      if (rows.length) return rows;
      return filmGrabSeed.map((item, index) => ({ id: index + 1, filmTitle: item.filmTitle, sourcePage: item.sourcePage, imageUrls: JSON.stringify(item.imageUrls), palette: JSON.stringify(item.palette), analysis: JSON.stringify(item.analysis), sourceUpdatedAt: null, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) }));
    }),
    count: publicProcedure.query(async () => {
      const count = await countFilmGrabBenchmarks();
      return count || filmGrabSeed.length;
    }),
    sync: publicProcedure.mutation(async () => {
      for (const item of filmGrabSeed) {
        await upsertFilmGrabBenchmark({
          filmTitle: item.filmTitle,
          sourcePage: item.sourcePage,
          imageUrls: JSON.stringify(item.imageUrls),
          palette: JSON.stringify(item.palette),
          analysis: JSON.stringify(item.analysis)
        });
      }
      return { synced: filmGrabSeed.length };
    }),
    syncLatest: publicProcedure.mutation(async () => {
      const { syncLatestFilmGrab: syncLatestFilmGrab2 } = await Promise.resolve().then(() => (init_filmGrabRemote(), filmGrabRemote_exports));
      return syncLatestFilmGrab2(12);
    })
  }),
  characterPrompts: router({
    list: publicProcedure.query(async () => {
      const rows = await listCharacterPromptBenchmarks();
      if (rows.length) return rows;
      return characterPromptSeed.map((item, index) => ({ id: index + 1, caseName: item.caseName, platform: item.platform, strength: item.strength, inputFields: JSON.stringify({ fields: item.fields, locks: item.locks }), outputPrompts: JSON.stringify(item.outputs), sourceLabel: item.sourceLabel, createdAt: /* @__PURE__ */ new Date(0), updatedAt: /* @__PURE__ */ new Date(0) }));
    }),
    sync: publicProcedure.mutation(async () => {
      for (const item of characterPromptSeed) {
        await upsertCharacterPromptBenchmark({
          caseName: item.caseName,
          platform: item.platform,
          strength: item.strength,
          inputFields: JSON.stringify({ fields: item.fields, locks: item.locks }),
          outputPrompts: JSON.stringify(item.outputs),
          sourceLabel: item.sourceLabel
        });
      }
      return { synced: characterPromptSeed.length };
    })
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  })
  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var index_default = app;
export {
  index_default as default
};
