export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'merge'
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never']
  }
};
