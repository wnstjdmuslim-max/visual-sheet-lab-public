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
    list: publicProcedure.query(() => listFilmGrabBenchmarks()),
    count: publicProcedure.query(() => countFilmGrabBenchmarks()),
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
  }),
  characterPrompts: router({
    list: publicProcedure.query(() => listCharacterPromptBenchmarks()),
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
