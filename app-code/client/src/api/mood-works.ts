import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  MoodWork,
  MoodWorkCreateRequest,
  MoodWorkListResponse,
} from '@shared/api.interface';

/**
 * 心情作品 API 封装
 */

// 分页列表
export async function list(
  page: number = 1,
  pageSize: number = 20,
): Promise<MoodWorkListResponse> {
  try {
    const res = await axiosForBackend.get('/api/mood-works', {
      params: { page, pageSize },
    });
    return res.data as MoodWorkListResponse;
  } catch (error) {
    logger.error('listMoodWorks 失败', error);
    throw error;
  }
}

// 按日期范围获取作品
export async function getByDateRange(
  startDate: string,
  endDate: string,
): Promise<MoodWork[]> {
  try {
    const res = await axiosForBackend.get('/api/mood-works/range', {
      params: { startDate, endDate },
    });
    return res.data as MoodWork[];
  } catch (error) {
    logger.error('getMoodWorksByRange 失败', error);
    throw error;
  }
}

// 获取全年作品
export async function getByYear(year: number): Promise<MoodWork[]> {
  try {
    const res = await axiosForBackend.get('/api/mood-works/year', {
      params: { year },
    });
    return res.data as MoodWork[];
  } catch (error) {
    logger.error('getMoodWorksByYear 失败', error);
    throw error;
  }
}

// 创建/保存作品
export async function create(
  dto: MoodWorkCreateRequest,
): Promise<MoodWork> {
  try {
    const res = await axiosForBackend.post('/api/mood-works', dto);
    return res.data as MoodWork;
  } catch (error) {
    logger.error('saveMoodWork 失败', error);
    throw error;
  }
}

// 删除作品
export async function remove(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/mood-works/${id}`);
  } catch (error) {
    logger.error('deleteMoodWork 失败', error);
    throw error;
  }
}

// === 任务指定的函数名别名 ===
export const listMoodWorks = list;
export const getMoodWorksByRange = getByDateRange;
export const getMoodWorksByYear = getByYear;
export const saveMoodWork = create;
export const createMoodWork = create;
export const deleteMoodWork = remove;
