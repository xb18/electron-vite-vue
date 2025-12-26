import { httpGet } from '@/utils/http'

export async function getHello() {
  return await httpGet('/pyapi/hello');
}