<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <div class="error-message">页面未找到</div>
      <div class="error-description">
        抱歉，您访问的页面不存在或已被移动
      </div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ElButton, ElIcon } from 'element-plus';
import { HomeFilled, ArrowLeft } from '@element-plus/icons-vue';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.go(-1);
};
</script>

<style scoped lang="scss">
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;

  .not-found-content {
    .error-code {
      font-size: 120px;
      font-weight: bold;
      color: var(--el-color-primary);
      line-height: 1;
      margin-bottom: 20px;
    }

    .error-message {
      font-size: 32px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 12px;
    }

    .error-description {
      font-size: 16px;
      color: var(--el-text-color-secondary);
      margin-bottom: 32px;
      max-width: 400px;
    }

    .error-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
  }
}
</style>