import { logger } from '../../../logger';
import { readLocalFile } from '../../../util/fs';
import { parseSingleYaml } from '../../../util/yaml';
import { RedHatRPMLockfile } from '../../manager/rpm/schema';
import type { RedHatRPMLockfileDefinition } from '../../manager/rpm/schema';
import { Datasource } from '../datasource';
import type { GetReleasesConfig, ReleaseResult } from '../types';

export class RPMLockfileDatasource extends Datasource {
  static readonly id = 'rpm-lockfile';
  dependencyUpdateData: Map<string, string> = new Map();
  dependencyCheckInitiated = false;

  constructor() {
    super(RPMLockfileDatasource.id);
  }

  async loadUpdatedLockfile(): Promise<void> {
    const newLockFileContent = await readLocalFile(
      'rpms.lock.tmp.yaml',
      'utf8',
    );

    if (newLockFileContent === null) {
      logger.debug('New lockfile content is null');
      return;
    }

    const lockFile: RedHatRPMLockfileDefinition = parseSingleYaml(
      newLockFileContent,
      { customSchema: RedHatRPMLockfile },
    );

    for (const arch of lockFile.arches) {
      for (const dependency of arch.packages) {
        if (!this.dependencyUpdateData.has(dependency.name)) {
          this.dependencyUpdateData.set(dependency.name, dependency.evr);
        }
      }
    }
  }

  override async getReleases(
    getReleasesConfig: GetReleasesConfig,
  ): Promise<ReleaseResult | null> {
    if (!this.dependencyCheckInitiated) {
      await this.loadUpdatedLockfile();
      this.dependencyCheckInitiated = true;
    }

    const packageVersion = this.dependencyUpdateData.get(
      getReleasesConfig.packageName,
    );

    if (packageVersion === undefined) {
      return null;
    }

    return {
      releases: [
        {
          version: packageVersion,
        },
      ],
    };
  }
}
