// @ts-nocheck
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import axios from "axios";
import VueAxios from "vue-axios";

const app = createApp(App);
// 導入的外部套件要記得使用-
app.use(VueAxios, axios);
app.use(ElementPlus);
app.mount("#app");

