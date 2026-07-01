import { describe, it, expect } from 'vitest';
import type { MediaFile, MediaFolder } from '@simple-site/interfaces';
import {
  renameFileLocally,
  renameFolderLocally,
  sanitizeFileName,
  sanitizeFolderName,
  sortFiles,
  sortFolders,
} from './mediaUtils';

const f = (over: Partial<MediaFile> & Pick<MediaFile, 'fileId' | 'name'>): MediaFile => ({
  filePath: `/media/${over.name}`,
  url: `https://ik/${over.name}`,
  ...over,
});

const names = (files: MediaFile[]) => files.map((file) => file.name);

describe('sortFolders', () => {
  it('orders folders alphabetically (case-insensitive)', () => {
    const folders: MediaFolder[] = [
      { folderId: '1', name: 'Zebra', path: '/Zebra' },
      { folderId: '2', name: 'apple', path: '/apple' },
      { folderId: '3', name: 'Mango', path: '/Mango' },
    ];
    expect(sortFolders(folders).map((folder) => folder.name)).toEqual(['apple', 'Mango', 'Zebra']);
  });

  it('does not mutate the input array', () => {
    const folders: MediaFolder[] = [
      { folderId: '1', name: 'b', path: '/b' },
      { folderId: '2', name: 'a', path: '/a' },
    ];
    sortFolders(folders);
    expect(folders.map((folder) => folder.name)).toEqual(['b', 'a']);
  });
});

describe('sortFiles', () => {
  it('sorts by creation date ascending by default (oldest first, newest last)', () => {
    const files = [
      f({ fileId: '2', name: 'newer.png', createdAt: '2026-02-01T00:00:00Z' }),
      f({ fileId: '1', name: 'older.png', createdAt: '2026-01-01T00:00:00Z' }),
    ];
    expect(names(sortFiles(files, 'createdAt', 'asc'))).toEqual(['older.png', 'newer.png']);
  });

  it('places files with no creation date last in ascending order (just-uploaded → end)', () => {
    const files = [
      f({ fileId: '1', name: 'dated.png', createdAt: '2026-01-01T00:00:00Z' }),
      f({ fileId: '2', name: 'fresh-upload.png' }), // no createdAt yet
    ];
    expect(names(sortFiles(files, 'createdAt', 'asc'))).toEqual(['dated.png', 'fresh-upload.png']);
  });

  it('sorts by name with direction', () => {
    const files = [
      f({ fileId: '1', name: 'banana.png' }),
      f({ fileId: '2', name: 'apple.png' }),
      f({ fileId: '3', name: 'cherry.png' }),
    ];
    expect(names(sortFiles(files, 'name', 'asc'))).toEqual(['apple.png', 'banana.png', 'cherry.png']);
    expect(names(sortFiles(files, 'name', 'desc'))).toEqual(['cherry.png', 'banana.png', 'apple.png']);
  });

  it('sorts by size, width and height numerically', () => {
    const files = [
      f({ fileId: '1', name: 'mid.png', size: 200, width: 50, height: 90 }),
      f({ fileId: '2', name: 'small.png', size: 100, width: 80, height: 30 }),
      f({ fileId: '3', name: 'big.png', size: 300, width: 20, height: 60 }),
    ];
    expect(names(sortFiles(files, 'size', 'asc'))).toEqual(['small.png', 'mid.png', 'big.png']);
    expect(names(sortFiles(files, 'width', 'asc'))).toEqual(['big.png', 'mid.png', 'small.png']);
    expect(names(sortFiles(files, 'height', 'desc'))).toEqual(['mid.png', 'big.png', 'small.png']);
  });

  it('uses the name as a stable tie-breaker when values are equal', () => {
    const files = [
      f({ fileId: '1', name: 'b.png', size: 100 }),
      f({ fileId: '2', name: 'a.png', size: 100 }),
    ];
    expect(names(sortFiles(files, 'size', 'asc'))).toEqual(['a.png', 'b.png']);
  });

  it('does not mutate the input array', () => {
    const files = [f({ fileId: '1', name: 'b.png' }), f({ fileId: '2', name: 'a.png' })];
    sortFiles(files, 'name', 'asc');
    expect(names(files)).toEqual(['b.png', 'a.png']);
  });
});

describe('sanitizeFileName / sanitizeFolderName', () => {
  it('keeps valid file-name characters and replaces the rest with underscores', () => {
    expect(sanitizeFileName('  my photo (1).png ')).toBe('my_photo__1_.png');
    expect(sanitizeFileName('already-ok_2.jpg')).toBe('already-ok_2.jpg');
  });

  it('keeps letters/numbers/dash in folder names and replaces the rest', () => {
    expect(sanitizeFolderName('  Q1 / reports ')).toBe('Q1___reports');
    expect(sanitizeFolderName('été-2026')).toBe('été-2026'); // unicode letters preserved
  });
});

describe('renameFileLocally', () => {
  it('updates the name and swaps the last segment of filePath and url', () => {
    const file = f({
      fileId: '1',
      name: 'old.png',
      filePath: '/root/products/old.png',
      url: 'https://ik/root/products/old.png',
    });
    expect(renameFileLocally(file, 'new.png')).toMatchObject({
      fileId: '1',
      name: 'new.png',
      filePath: '/root/products/new.png',
      url: 'https://ik/root/products/new.png',
    });
  });
});

describe('renameFolderLocally', () => {
  it('updates the name and the relative path, keeping the parent prefix', () => {
    expect(renameFolderLocally({ folderId: '1', name: 'old', path: '/a/old' }, 'new')).toEqual({
      folderId: '1',
      name: 'new',
      path: '/a/new',
    });
    expect(renameFolderLocally({ folderId: '2', name: 'old', path: '/old' }, 'new')).toEqual({
      folderId: '2',
      name: 'new',
      path: '/new',
    });
  });
});
