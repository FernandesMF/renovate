import type { UpdateArtifact, UpdateArtifactsResult } from "../types";
import { logger } from "../../../logger";
import { deleteLocalFile, readLocalFile } from "../../../util/fs";
import { exec } from '../../../util/exec';
import type { ExecOptions } from '../../../util/exec/types';
import { TEMPORARY_ERROR } from '../../../constants/error-messages';

export async function updateArtifacts({
  packageFileName,
  updatedDeps,
  newPackageFileContent,
  config,
}: UpdateArtifact): Promise<UpdateArtifactsResult[] | null> {
  logger.debug(`rpm.updateArtifacts(${packageFileName})`);
  let extension = packageFileName.split('.').pop();

  // Override the package name, since the manager needs
  // to be set to have `rpms.lock.yaml` as the package file.
  packageFileName = `rpms.in.${extension}`;
  let lockFileName = `rpms.lock.${extension}`;

  logger.debug(`RPM lock file: ${lockFileName}`);

  const existingLockFileContent = await readLocalFile(lockFileName, 'utf8');

  logger.debug(`Updating ${lockFileName}`);

  const cmd: string[] = [];

  try {
    await deleteLocalFile(lockFileName);

    cmd.push(`rpm-lockfile-prototype ${packageFileName}`);

    const execOptions: ExecOptions = {
      cwdFile: packageFileName,
    }

    await exec(cmd, execOptions);

    const newLockFileContent = await readLocalFile(lockFileName, 'utf8');

    if (existingLockFileContent === newLockFileContent) {
      logger.debug(`${lockFileName} is unchanged`);
      return null;
    }

    logger.debug(`Returning updated ${lockFileName}`);

    return [
      {
        file: {
          type: 'addition',
          path: lockFileName,
          contents: newLockFileContent,
        }
      }
    ];
  } catch (err) {
    if (err.message === TEMPORARY_ERROR) {
      throw err;
    }
    logger.debug({ err }, `Failed to update ${lockFileName} file`);
    return [
      {
        artifactError: {
          lockFile: lockFileName,
          stderr: `${String(err.stdout)}\n${String(err.stderr)}`,
        },
      },
    ];
  }
}
