import chalk from 'chalk';
import ms from 'ms';
import plural from 'pluralize';
import { Output } from '../../util/output';
import { ProjectEnvVariable, ProjectEnvTarget, NowContext } from '../../types';
import Client from '../../util/client';
import formatTable from '../../util/format-table';
import getEnvVariables from '../../util/env/get-env-records';
import { getLinkedProject } from '../../util/projects/link';
import stamp from '../../util/output/stamp';
import cmd from '../../util/output/cmd';

type Options = {
  '--debug': boolean;
};

export default async function ls(
  ctx: NowContext,
  opts: Options,
  args: string[],
  output: Output
) {
  const {
    authConfig: { token },
    config,
  } = ctx;
  const { currentTeam } = config;
  const { apiUrl } = ctx;
  const debug = opts['--debug'];
  const client = new Client({ apiUrl, token, currentTeam, debug });

  const link = await getLinkedProject(output, client);

  if (link.status === 'error') {
    return link.exitCode;
  } else if (link.status === 'not_linked') {
    output.print(
      `${chalk.red(
        'Error!'
      )} Your codebase isn’t linked to a project on ZEIT Now. Run ${cmd(
        'now'
      )} to link it.\n`
    );
    return 1;
  } else {
    const { project } = link;
    const envTarget = args[0] as ProjectEnvTarget | undefined;
    const lsStamp = stamp();

    if (args.length > 1) {
      output.error(
        `Invalid number of arguments. Usage: ${chalk.cyan(
          '`now env ls [environment]`'
        )}`
      );
      return 1;
    }

    const records = await getEnvVariables(
      output,
      client,
      project.id,
      envTarget
    );
    output.log(
      `${plural(
        'Environment Variables',
        records.length,
        true
      )} found under ${chalk.bold(project.name)} ${chalk.gray(lsStamp())}`
    );
    console.log(getTable(records));
    return 0;
  }
}

function getTable(records: ProjectEnvVariable[]) {
  return formatTable(
    ['key', 'value', 'environment', 'created', 'updated'],
    ['r', 'l', 'l', 'l', 'l'],
    [
      {
        name: 'Environment Variables',
        rows: records.map(getRow),
      },
    ]
  );
}

function getRow({
  key,
  value,
  target,
  createdAt = 0,
  updatedAt = 0,
}: ProjectEnvVariable) {
  const now = Date.now();
  return [
    key,
    value,
    target || chalk.gray('global'),
    `${ms(now - createdAt)} ago`,
    `${ms(now - updatedAt)} ago`,
  ];
}
