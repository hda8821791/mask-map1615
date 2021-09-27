import Axios from "axios";
import { ElMessage, ElLoading, ILoadingInstance } from "element-plus";

const baseURL = "https://mask-map-db1615.vercel.app/";

const axios = Axios.create({
  baseURL,
  timeout: 20000,
});

let loading: ILoadingInstance;
let loadingNum = 0;
function startLoading() {
  if (loadingNum == 0) {
    loading = ElLoading.service({
      lock: true,
      text: "加載中...",
      background: "rgba(255,255,255,0.5)",
    });
  }
  loadingNum++;
}
function endLoading() {
  loadingNum--;
  if (loadingNum <= 0) {
    loading.close();
  }
}

axios.interceptors.request.use(
  (response) => {
    startLoading();
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    endLoading();
    return response;
  },
  (error) => {
    endLoading();
    if (error.response && error.response.data) {
      const code = error.response.status;
      const msg = error.response.data.message;
      ElMessage.error(`Code: ${code}, Message: ${msg}`);
      console.error(`[Axios Error]`, error.response);
    } else {
      ElMessage.error(`${error}`);
    }
    return Promise.reject(error);
  }
);

export default axios;
