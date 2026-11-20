import { BusinessSettings } from "../interfaces/engagement.interface";
import { BusinessSettingsModel } from "../models";

const SETTINGS_KEY = "business";

export type SettingsUpdate = Partial<Omit<BusinessSettings, "_id" | "key" | "createdAt" | "updatedAt" | "currency">>;

class SettingsService {
  private readonly settingsModel = BusinessSettingsModel;

  /** Returns the settings, creating the defaults on first use. */
  public async get(): Promise<BusinessSettings> {
    const settings = await this.settingsModel
      .findOneAndUpdate({ key: SETTINGS_KEY }, { $setOnInsert: { key: SETTINGS_KEY } }, { upsert: true, new: true, setDefaultsOnInsert: true })
      .lean<BusinessSettings>()
      .exec();
    return settings as BusinessSettings;
  }

  public async update(input: SettingsUpdate): Promise<BusinessSettings> {
    await this.get();
    const settings = await this.settingsModel
      .findOneAndUpdate({ key: SETTINGS_KEY }, { $set: input }, { new: true, runValidators: true })
      .lean<BusinessSettings>()
      .exec();
    return settings as BusinessSettings;
  }
}

export const settingsService = new SettingsService();
