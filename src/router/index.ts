/**
 * Vue Router 配置
 * 企业级路由架构设计
 */

import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw,
} from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
    meta: {
      title: "页面未找到",
      requiresAuth: false,
    },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 导航守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - Electron Tool`;
  }

  next();
});

router.afterEach((to, from) => {
  // 路由导航完成后的处理
});

// 错误处理
router.onError((error) => {
  console.error("Router error:", error);
});

export default router;
