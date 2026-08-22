import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { countFilmGrabBenchmarks, listCharacterPromptBenchmarks, listFilmGrabBenchmarks, upsertCharacterPromptBenchmark, upsertFilmGrabBenchmark } from "./db";
import { characterPromptSeed } from "./characterPromptSeed";
import { filmGrabSeed } from "./filmGrabSeed";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  filmGrab: router({
    list: publicProcedure.query(async () => {
      const rows = await listFilmGrabBenchmarks();
      if (rows.length) return rows;
      return filmGrabSeed.map((item, index) => ({ id: index + 1, filmTitle: item.filmTitle, sourcePage: item.sourcePage, imageUrls: JSON.stringify(item.imageUrls), palette: JSON.stringify(item.palette), analysis: JSON.stringify(item.analysis), sourceUpdatedAt: null, createdAt: new Date(0), updatedAt: new Date(0) }));
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
          analysis: JSON.stringify(item.analysis),
        });
      }
      return { synced: filmGrabSeed.length } as const;
    }),
    syncLatest: publicProcedure.mutation(async () => {
      const { syncLatestFilmGrab } = await import("./filmGrabRemote");
      return syncLatestFilmGrab(12);
    }),
  }),
  characterPrompts: router({
    list: publicProcedure.query(async () => {
      const rows = await listCharacterPromptBenchmarks();
      if (rows.length) return rows;
      return characterPromptSeed.map((item, index) => ({ id: index + 1, caseName: item.caseName, platform: item.platform, strength: item.strength, inputFields: JSON.stringify({ fields: item.fields, locks: item.locks }), outputPrompts: JSON.stringify(item.outputs), sourceLabel: item.sourceLabel, createdAt: new Date(0), updatedAt: new Date(0) }));
    }),
    sync: publicProcedure.mutation(async () => {
      for (const item of characterPromptSeed) {
        await upsertCharacterPromptBenchmark({
          caseName: item.caseName,
          platform: item.platform,
          strength: item.strength,
          inputFields: JSON.stringify({ fields: item.fields, locks: item.locks }),
          outputPrompts: JSON.stringify(item.outputs),
          sourceLabel: item.sourceLabel,
        });
      }
      return { synced: characterPromptSeed.length } as const;
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
