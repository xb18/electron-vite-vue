import Store from "electron-store";

interface StoreType {
  example_id: string;
}
// 初始化存储实例
export const store = new Store<StoreType>({
  name: "config",
  defaults: {
    example_id: '',
  },
});
