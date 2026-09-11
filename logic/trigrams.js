"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIGRAM_YAO_MAP = exports.TRIGRAMS = void 0;
exports.getTrigramFromYaos = getTrigramFromYaos;
exports.TRIGRAMS = [
    { id: 1, name: '乾', symbol: '☰', element: '金', nature: '天' },
    { id: 2, name: '兑', symbol: '☱', element: '金', nature: '泽' },
    { id: 3, name: '离', symbol: '☲', element: '火', nature: '火' },
    { id: 4, name: '震', symbol: '☳', element: '木', nature: '雷' },
    { id: 5, name: '巽', symbol: '☴', element: '木', nature: '风' },
    { id: 6, name: '坎', symbol: '☵', element: '水', nature: '水' },
    { id: 7, name: '艮', symbol: '☶', element: '土', nature: '山' },
    { id: 8, name: '坤', symbol: '☷', element: '土', nature: '地' },
];
exports.TRIGRAM_YAO_MAP = {
    1: [false, false, false],
    2: [false, false, true],
    3: [false, true, false],
    4: [false, true, true],
    5: [true, false, false],
    6: [true, false, true],
    7: [true, true, false],
    8: [true, true, true],
};
function getTrigramFromYaos(yaos) {
    for (const [id, trigramYaos] of Object.entries(exports.TRIGRAM_YAO_MAP)) {
        if (trigramYaos.every((y, i) => y === yaos[i])) {
            return exports.TRIGRAMS[parseInt(id) - 1];
        }
    }
    return exports.TRIGRAMS[0];
}
