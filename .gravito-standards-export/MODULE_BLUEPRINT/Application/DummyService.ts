import { Inject } from '@gravito/core';
import { DUMMY_REPOSITORY_TOKEN, DummyRepository, Dummy } from '../Domain/DummyRepository';

/**
 * 應用服務
 * 處理 Use Case 邏輯
 */
export class DummyService {
  constructor(
    @Inject(DUMMY_REPOSITORY_TOKEN)
    private readonly repository: DummyRepository
  ) {}

  /**
   * 執行某個業務操作
   */
  public async executeTask(id: string): Promise<Dummy> {
    const item = await this.repository.findById(id);
    
    if (!item) {
      throw new Error('Item not found');
    }

    // 執行業務邏輯...
    
    return item;
  }
}
