<template>
  <div id="app">
    <el-container>
      <el-aside class="el-aside">
        <div>
          <!-- 選擇所在區域 -->
          <el-select
            v-model="select.city"
            placeholder="縣市"
            @change="chengeCity"
          >
            <el-option
              v-for="(c, i) in cityNames"
              :key="c.CityName"
              :label="c.CityName"
              :value="i"
            >
            </el-option>
          </el-select>
          <el-select
            v-model="select.area"
            placeholder="地區"
            @change="chengeArea"
          >
            <el-option
              v-for="a in areas"
              :key="a.AreaName"
              :label="a.AreaName"
              :value="a.AreaName"
            >
            </el-option>
          </el-select>
        </div>
        <ul>
          <template v-for="(item, key) in data" :key="key">
            <a @click="moveCenter(item)">
              <h1>
                {{ item.properties.name }}
              </h1>
            </a>
          </template>
        </ul>
      </el-aside>
      <el-main>
        <div id="map"></div>
      </el-main>
    </el-container>
  </div>
</template>

<script lang="ts">
import {
  reactive,
  ref,
  toRefs,
  getCurrentInstance,
  onMounted,
  Ref,
} from "vue";
import CityCountyData from "../src/assets/CityCountyData.json";
import L, { Map } from "leaflet";
import { AxiosInstance } from "axios";

interface State {
  select: {
    city: string;
    area: string;
    pharmacies: Array<Pharmacy>;
  };
  center: {
    lat: number;
    lng: number;
  };
}

// 地圖更新事件
interface Pharmacy {
  properties: Properties;
  geometry: Geometry;
}

interface Properties {
  id: string;
  name: string;
  phone: string;
  address: string;
  available: string;
  county: string;
  cunli: string;
  custom_note: string;
  mask_adult: number;
  mask_child: number;
  note: string;
  service_periods: string;
  town: string;
  updated: string;
}

interface Geometry {
  coordinates: Array<number>;
}

export default {
  setup() {
    const cityNames = ref(CityCountyData);
    // 藥局數據
    // const api = "https://mask-map-db1616.herokuapp.com";
    // const api = "http://localhost:5000";
    const state: State = reactive({
      select: {
        city: "",
        area: "",
        pharmacies: [],
      },
      center: {
        lat: 22.62923093157038,
        lng: 120.33885236441782,
      },
    });
    /* @ts-ignore */
    let osmMap: Ref<Map> = ref();
    let data: any = ref();
    // 區域清單
    let areas = ref();
    // context
    const { proxy }: any = getCurrentInstance();
    const http: AxiosInstance = proxy.$http;
    // 地圖配置
    const setMap = () => {
      osmMap.value = L.map("map", {
        center: state.center,
        zoom: 18,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(osmMap.value);

      L.marker(state.center, {
        title: "dsfsfds",
        opacity: 1.0,
        icon: L.icon({
          iconUrl:
            "http://wordpress.bestdaylong.com/wp-content/uploads/2019/07/玉免吃月餅.jpg",
          iconSize: [42, 42],
        }),
      }).addTo(osmMap.value);
    };

    // 取得數據
    const getData = async () => {
      let city = cityNames.value[Number(state.select.city)].CityName;
      let area = state.select.area === "" ? "無" : state.select.area;
      console.log(city);
      await http.get(`/mask/${city}/${area}`).then(
        (res: any) => {
          data.value = res.data;
          console.log("getData", res);
        },
        () => {
          console.log("請求失敗");
        }
      );
    };
    // 加载鉤子
    onMounted(() => {
      setMap();
    });
    // 城市選取改變事件
    const chengeCity = async () => {
      state.select.area = "";
      await getData();
      await loadAreas();
      await removeLayer();
      await updateMap();
      moveCenter();
      // console.log("chengeCity", data.value);
    };
    // 區域選取改變事件
    const chengeArea = async () => {
      await getData();
      await removeLayer();
      await updateMap();
      moveCenter();
    };
    // 刪除就標記
    const removeLayer = () => {
      osmMap.value.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          osmMap.value.removeLayer(layer);
        }
      });
    };

    // 載入區域清單
    const loadAreas = () => {
      if (state.select.city !== "") {
        areas.value = cityNames.value[parseInt(state.select.city)].AreaList;
      }
    };

    // 移動中心座標
    const moveCenter = async (pharmacy?: Pharmacy) => {
      if (pharmacy) {
        console.log("moveCenter", pharmacy.geometry.coordinates);
        await osmMap.value.flyTo(
          [pharmacy.geometry.coordinates[1], pharmacy.geometry.coordinates[0]],
          15,
          {
            duration: 1,
            easeLinearity: 0,
          }
        );
        L.marker([
          pharmacy.geometry.coordinates[1],
          pharmacy.geometry.coordinates[0],
        ])
          .addTo(osmMap.value)
          .bindPopup(
            `
        <strong>${pharmacy.properties.name}</strong> <br>口罩剩餘：
        <strong>成人 - ${
          pharmacy.properties.mask_adult
            ? `${pharmacy.properties.mask_adult} 個`
            : "未取得資料"
        }/ 兒童 - ${
              pharmacy.properties.mask_child
                ? `${pharmacy.properties.mask_child} 個`
                : "未取得資料"
            }</strong><br>
        <strong>座標${pharmacy.geometry.coordinates[1]} , ${
              pharmacy.geometry.coordinates[0]
            }</strong>
    地址:
    <a href="https://www.google.com.tw/maps/place/${
      pharmacy.properties.address
    }" target="_blank">
    ${pharmacy.properties.address}
    </a><br>
    電話: ${pharmacy.properties.phone}<br>
    <small>最後更新時間: ${pharmacy.properties.updated}</small>`
          )
          .openPopup();
        return;
      }
      const result: Array<Pharmacy> = data.value;
      // 最大經緯度
      const lng = reactive({
        max: 0,
        min: 200,
        center: 0,
      });
      // 最小經緯度
      const lat = reactive({
        max: 0,
        min: 30,
        center: 0,
      });

      await result.forEach((pharmacy: Pharmacy) => {
        if (lng.max < pharmacy.geometry.coordinates[0]) {
          lng.max = pharmacy.geometry.coordinates[0];
        }
        if (lng.min > pharmacy.geometry.coordinates[0]) {
          lng.min = pharmacy.geometry.coordinates[0];
        }
        if (lat.max < pharmacy.geometry.coordinates[1]) {
          lat.max = pharmacy.geometry.coordinates[1];
        }
        if (lat.min > pharmacy.geometry.coordinates[1]) {
          lat.min = pharmacy.geometry.coordinates[1];
        }
      });

      lng.center = (lng.max + lng.min) / 2;
      lat.center = (lat.max + lat.min) / 2;
      // console.log(lng.center);
      // console.log(lat.center);
      if (lng.center !== 100 || lat.center !== 15) {
        if (state.select.area === "") {
          osmMap.value.flyTo([lat.center, lng.center], 10.5, {
            duration: 2,
            easeLinearity: 0,
          });
        } else {
          osmMap.value.flyTo([lat.center, lng.center], 12, {
            duration: 1,
            easeLinearity: 0,
          });
        }
      }
    };

    const updateMap = async () => {
      console.log("updateMap", data.value);
      data.value.forEach((pharmacy: Pharmacy) => {
        // console.log(pharmacy.properties.town);
        const { properties, geometry } = pharmacy;
        L.marker([geometry.coordinates[1], geometry.coordinates[0]]).addTo(
          osmMap.value
        ).bindPopup(`
        <strong>${properties.name}</strong> <br>口罩剩餘：
        <strong>成人 - ${
          properties.mask_adult ? `${properties.mask_adult} 個` : "未取得資料"
        }/ 兒童 - ${
          properties.mask_child ? `${properties.mask_child} 個` : "未取得資料"
        }</strong><br>
        <strong>座標${geometry.coordinates[1]} , ${
          geometry.coordinates[0]
        }</strong>
    地址:
    <a href="https://www.google.com.tw/maps/place/${
      properties.address
    }" target="_blank">
    ${properties.address}
    </a><br>
    電話: ${properties.phone}<br>
    <small>最後更新時間: ${properties.updated}</small>`);
      });
    };

    return {
      cityNames,
      ...toRefs(state),
      chengeCity,
      chengeArea,
      areas,
      moveCenter,
      data,
    };
  },
};
</script>

<style lang="scss">
.el-aside {
  height: 100vh;
  width: 20%;
  border-right: 1px solid #000;
}
#map {
  height: 100%;
}
</style>
