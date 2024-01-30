

export function getRfxcom2MQTTVersion(): string {
  const packageJSON = require('..' + '/package.json');
  return packageJSON.version;
}  


export default { getRfxcom2MQTTVersion }