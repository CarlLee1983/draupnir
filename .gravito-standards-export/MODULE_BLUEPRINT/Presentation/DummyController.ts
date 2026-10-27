import { Request, Response } from '@gravito/photon';
import { DummyService } from '../Application/DummyService';

/**
 * 表現層控制器
 * 負責 HTTP 路由處理
 */
export class DummyController {
  constructor(
    private readonly service: DummyService
  ) {}

  /**
   * 顯示詳情頁面 (Inertia 範例)
   */
  public async show(req: Request, res: Response) {
    const id = req.param('id');
    const data = await this.service.executeTask(id);

    return res.inertia('Dummy/Show', {
      item: data
    });
  }

  /**
   * API 響應範例
   */
  public async apiGet(req: Request, res: Response) {
    const id = req.param('id');
    const data = await this.service.executeTask(id);

    return res.json({
      success: true,
      data
    });
  }
}
