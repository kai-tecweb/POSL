// メインエントリーポイント
// このファイルは webpack のエントリーポイントとして使用されますが、
// 実際の Lambda 関数は個別のファイルから export されます

export { handler as getSettingsHandler } from './functions/settings/getSettings';
export { handler as updateSettingsHandler } from './functions/settings/updateSettings';