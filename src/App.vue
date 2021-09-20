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
            <div v-if="select.city">
              <el-option
                v-for="a in cityNames[Number(select.city)].AreaList"
                :key="a.AreaName"
                :label="a.AreaName"
                :value="a.AreaName"
              >
              </el-option>
            </div>
          </el-select>
        </div>
      </el-aside>
      <el-main>
        <div id="map"></div>
      </el-main>
    </el-container>
  </div>
</template>

<script lang="ts">
import { reactive, ref, toRefs, getCurrentInstance, onMounted } from "vue";
import CityCountyData from "../src/assets/CityCountyData.json";
import L from "leaflet";

export default {
  setup() {
    const cityNames = ref(CityCountyData);
    const state = reactive({
      select: {
        city: "",
        area: "",
      },
      data: [],
      center: {
        lat: 22.62923093157038,
        lng: 120.33885236441782,
      },
    });
    let osmMap = ref();
    // context
    const instance: any = getCurrentInstance();
    const loadData = () => {
      osmMap.value = L.map("map", {
        center: state.center,
        zoom: 18,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(osmMap.value);

      L.marker(state.center).addTo(osmMap.value);
    };

    onMounted(() => {
      instance.proxy.$http.get(api).then((res: any) => {
        state.data = res.data.features;
      });
      loadData();
    });

    // 城市選取改變事件
    const chengeCity = () => {
      state.select.area = "";
      moveCenter();
      removeLayer();
      updateMap();
    };
    // 區域選取改變事件
    const chengeArea = () => {
      console.log("15151515", osmMap.value.eachLayer);
      console.log(state.select.area);
      osmMap.value.panTo(new L.LatLng(state.center.lat, state.center.lng));
      removeLayer();
      updateMap();
    };

    // 刪除就標記
    const removeLayer = () => {
      osmMap.value.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          osmMap.value.removeLayer(layer);
        }
      });
    };

    // 移動中心座標
    const moveCenter = () => {};

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

    const updateMap = () => {
      const pharmacies =
        state.select.area === ""
          ? state.data.filter(
              (pharmacy: Pharmacy) =>
                pharmacy.properties.county ===
                cityNames.value[Number(state.select.city)].CityName
            )
          : state.data.filter(
              (pharmacy: Pharmacy) =>
                pharmacy.properties.county ===
                  cityNames.value[Number(state.select.city)].CityName &&
                pharmacy.properties.town === state.select.area
            );

      pharmacies.forEach((pharmacy: Pharmacy) => {
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

    // 藥局數據
    const api =
      "https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json";

    return {
      cityNames,
      ...toRefs(state),
      chengeCity,
      chengeArea,
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
