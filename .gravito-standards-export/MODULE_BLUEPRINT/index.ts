import { Container, Module } from '@gravito/core';
import { BaseModule } from '@/Foundation/Infrastructure/Bases/BaseModule';
import { DummyController } from './Presentation/DummyController';
import { DummyService } from './Application/DummyService';
import { DUMMY_REPOSITORY_TOKEN } from './Domain/DummyRepository';
import { DummyRepositoryImpl } from './Infrastructure/DummyRepositoryImpl';

/**
 * 模組註冊中心
 * 這裡定義了模組的 DI 綁定與路由註冊
 */
export default class DummyModule extends BaseModule {
  public static async register(container: Container): Promise<void> {
    // 1. 註冊實作類到介面 Token
    container.singleton(DUMMY_REPOSITORY_TOKEN, DummyRepositoryImpl);
    
    // 2. 註冊應用服務
    container.singleton(DummyService);
    
    // 3. 註冊控制器
    container.singleton(DummyController);
  }

  public static async boot(container: Container): Promise<void> {
    // 模組啟動後的邏輯（可選）
  }
}
