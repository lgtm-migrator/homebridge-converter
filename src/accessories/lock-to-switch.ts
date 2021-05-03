import { ConvertAccessory } from '../types/common';
import { getStatus, registerEvent, runControl } from '../utils/client';
import { getAccessory, getCharacteristic } from '../utils/parser';

export const LockToSwitch: ConvertAccessory = kit => {
  const service = new kit.Service.Switch(kit.config.name);

  const LockTargetState = kit.Characteristic.LockTargetState;
  const aid = kit.config.aid;
  let iid: number;

  const On = service.getCharacteristic(kit.Characteristic.On)
    .onGet(async () => {
      kit.log.debug('Triggered GET On');
      if (!iid) {
        kit.log.debug('client is not initialized...');
        return false;
      }

      const status = await getStatus(kit, aid, iid);

      return !!status?.value;
    })
    .onSet(async value => {
      kit.log.debug('Triggered SET On', value);
      if (!iid) {
        kit.log.debug('client is not initialized...');
        return;
      }

      await runControl(kit, aid, iid, { value: value ? 1 : 0 });
    });

  kit.client.on('Ready', async () => {
    const accessory = await getAccessory(kit, aid);
    const characteristic = getCharacteristic(kit, accessory, LockTargetState.UUID);
    iid = characteristic.iid;
    registerEvent(kit, aid, iid);
  });

  kit.client.on('hapEvent', (events) => {
    const event = events.find(ev => ev.aid === aid && ev.iid === iid && ev.port === kit.config.port);
    if (!event) {
      return;
    }

    On.updateValue(!!event.value);
  });

  return service;
};
