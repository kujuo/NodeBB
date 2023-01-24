import fs from 'fs';
import path from 'path';
import utils from './utils';
import { paths } from './constants';
import plugins from './plugins';

// interface Error {
//     status?: number;
//     code?: number;
// }

type LanguageData = {
    name: string,
    code: string,
    dir: string,
}

interface IDictionary {
    [index:string]: string;
}

// const Languages = module.exports;
const languagesPath: string = path.join(__dirname, '../build/public/language');

const files: string[] = fs.readdirSync(path.join(paths.nodeModules, '/timeago/locales'));
// Languages.timeagoCodes = files.filter(f => f.startsWith('jquery.timeago')).map(f => f.split('.')[2]);
const timeagoCodes: string[] = files.filter(f => f.startsWith('jquery.timeago')).map(f => f.split('.')[2]);

export async function get(language: string, namespace: string): Promise<object> {
    const pathToLanguageFile: string = path.join(languagesPath, language, `${namespace}.json`);
    if (!pathToLanguageFile.startsWith(languagesPath)) {
        throw new Error('[[error:invalid-path]]');
    }
    const data: string = await fs.promises.readFile(pathToLanguageFile, 'utf8');
    // console.log(data);
    const parsed: IDictionary = JSON.parse(data) as IDictionary || {};
    // console.log('parsed');
    // console.log(parsed);

    const result = await plugins.hooks.fire('filter:languages.get', {
        language,
        namespace,
        data: parsed,
    });
    // console.log('data');
    // console.log(result.data);
    return result.data;
}

let codeCache: string[] = null;
export async function listCodes(): Promise<string[]> {
    if (codeCache && codeCache.length) {
        return codeCache;
    }
    try {
        const file: string = await fs.promises.readFile(path.join(languagesPath, 'metadata.json'), 'utf8');
        const parsed = JSON.parse(file);

        codeCache = parsed.languages;
        console.log(codeCache);
        return parsed.languages;
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'EN0ENT') {
            return [];
        }
        throw err;
        // if (err instanceof Error) {
        //     if (err.code === 'ENOENT')
        //     return [];
        // }
        // throw err;
    }
}

let listCache: LanguageData[] = null;
export async function list(): Promise<LanguageData[]> {
    if (listCache && listCache.length) {
        return listCache;
    }

    const codes = await listCodes();

    let languages: LanguageData[] = [];
    languages = await Promise.all(codes.map(async (folder) => {
        try {
            const configPath: string = path.join(languagesPath, folder, 'language.json');
            const file: string = await fs.promises.readFile(configPath, 'utf8');
            const lang: LanguageData = JSON.parse(file) as LanguageData;
            return lang;
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code === 'EN0ENT') {
                return;
            }
            throw err;
        }
    }));

    // filter out invalid ones
    languages = languages.filter(lang => lang && lang.code && lang.name && lang.dir);

    listCache = languages;

    return languages;
}

export async function userTimeagoCode(userLang: string): Promise<string> {
    const languageCodes: string[] = await listCodes();
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const timeagoCode: string = utils.userLangToTimeagoCode(userLang) as string;
    if (languageCodes.includes(userLang) && timeagoCodes.includes(timeagoCode)) {
        return timeagoCode;
    }
    return '';
}
