import { Module } from "../../mod.ts";
import { CounterController } from "./counter.controller.ts";
import { CounterService } from "./counter.service.ts";

@Module({
  controllers: [CounterController],
  providers: [CounterService],
})
export class AppModule {}
