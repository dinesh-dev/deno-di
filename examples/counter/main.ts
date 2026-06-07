import { DenoUIFactory } from "../../mod.ts";
import { AppModule } from "./app.module.ts";

const { bridge, destroy } = await DenoUIFactory.create(AppModule);

console.log("getCount  →", await bridge.dispatch("getCount"));
console.log("increment →", await bridge.dispatch("increment", { by: 5 }));
console.log("increment →", await bridge.dispatch("increment", { by: 3 }));
console.log("decrement →", await bridge.dispatch("decrement", { by: 2 }));
console.log("getCount  →", await bridge.dispatch("getCount"));

await destroy();
