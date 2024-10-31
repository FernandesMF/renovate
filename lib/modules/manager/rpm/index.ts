import type { Category } from '../../../constants';

export { updateArtifacts } from './artifacts';
export { extractPackageFile } from './extract';
import { RPMLockfileDatasource } from '../../datasource/rpm-lockfile';

export const supportsLockFileMaintenance = true;

export const supportedDatasources = [RPMLockfileDatasource.id];

export const defaultConfig = {
  fileMatch: ['(^|/)rpms\\.in\\.ya?ml$'],
};

export const categories: Category[] = ['rpm'];
