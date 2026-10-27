import { Dummy, DummyRepository } from '../Domain/DummyRepository';
import { BaseRepository } from '@/Foundation/Infrastructure/Bases/BaseRepository';

/**
 * 倉儲實作 (Adapter)
 * 使用 Atlas ORM 進行數據操作
 */
export class DummyRepositoryImpl extends BaseRepository implements DummyRepository {
  /**
   * 獲取資料庫連線或 Model (範例)
   */
  protected get model() {
    return this.db.table('dummies');
  }

  public async findById(id: string): Promise<Dummy | null> {
    const record = await this.model.where('id', id).first();
    return record ? (record as Dummy) : null;
  }

  public async save(dummy: Dummy): Promise<void> {
    await this.model.upsert(dummy);
  }

  public async delete(id: string): Promise<void> {
    await this.model.where('id', id).delete();
  }
}
