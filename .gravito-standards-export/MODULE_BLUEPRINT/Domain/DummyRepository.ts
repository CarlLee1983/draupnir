/**
 * 領域實體定義
 */
export interface Dummy {
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * 倉儲介面 Token (用於 DI)
 */
export const DUMMY_REPOSITORY_TOKEN = Symbol('DUMMY_REPOSITORY_TOKEN');

/**
 * 倉儲介面定義 (Port)
 */
export interface DummyRepository {
  findById(id: string): Promise<Dummy | null>;
  save(dummy: Dummy): Promise<void>;
  delete(id: string): Promise<void>;
}
