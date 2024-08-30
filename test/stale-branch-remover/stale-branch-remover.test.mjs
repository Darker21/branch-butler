import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import simpleGit from 'simple-git';
import readline from 'readline';
import { removeStaleBranches } from '../../src/stale-branch-remover/index.mjs';

jest.mock('simple-git');

describe('Stale-Branch-Remover', () => {
    /**@type {jest.Mock<import('simple-git').SimpleGit>} */
    let gitMock;
    /**@type {jest.SpiedFunction<import('readline').ReadLine>} */
    let readlineMock;

    beforeEach(() => {
        gitMock = {
            branchLocal: jest.fn(),
            branch: jest.fn(),
            status: jest.fn(),
            deleteLocalBranch: jest.fn(),
            checkout: jest.fn(),
        };

        simpleGit.mockImplementation(() => gitMock);

        // Mock the readline interface for user input
        readlineMock = jest.spyOn(readline, 'createInterface').mockReturnValue({
            question: jest.fn((_, cb) => cb('y')),
            close: jest.fn(),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should skip the current branch during deletion', async () => {
        const localBranches = ['main', 'feature-1', 'stale-branch'];
        const remoteBranches = ['main', 'feature-1'];

        gitMock.branchLocal.mockResolvedValue({ all: localBranches });
        gitMock.branch.mockResolvedValue({ all: remoteBranches.map(b => `origin/${b}`) });
        gitMock.status.mockResolvedValue({ current: 'main', isClean: () => true });

        await removeStaleBranches('', gitMock.getMockImplementation(), true);

        expect(gitMock.deleteLocalBranch).toHaveBeenCalledTimes(1);
        expect(gitMock.deleteLocalBranch).toHaveBeenCalledWith('stale-branch');
        expect(gitMock.deleteLocalBranch).not.toHaveBeenCalledWith('main');
    });

    it('should skip branches with pending changes', async () => {
        const localBranches = ['main', 'feature-1', 'stale-branch'];
        const remoteBranches = ['main', 'feature-1'];

        gitMock.branchLocal.mockResolvedValue({ all: localBranches });
        gitMock.branch.mockResolvedValue({ all: remoteBranches.map(b => `origin/${b}`) });
        gitMock.status
            .mockResolvedValueOnce({ current: 'main', isClean: () => true })
            .mockResolvedValueOnce({ current: 'feature-1', isClean: () => false })
            .mockResolvedValueOnce({ current: 'stale-branch', isClean: () => true });

        await removeStaleBranches('', gitMock, true);

        expect(gitMock.deleteLocalBranch).toHaveBeenCalledTimes(1);
        expect(gitMock.deleteLocalBranch).toHaveBeenCalledWith('stale-branch');
        expect(gitMock.deleteLocalBranch).not.toHaveBeenCalledWith('feature-1');
    });

    it('should not delete any branch if none are stale', async () => {
        const localBranches = ['main', 'feature-1'];
        const remoteBranches = ['main', 'feature-1'];

        gitMock.branchLocal.mockResolvedValue({ all: localBranches });
        gitMock.branch.mockResolvedValue({ all: remoteBranches.map(b => `origin/${b}`) });
        gitMock.status.mockResolvedValue({ current: 'main', isClean: () => true });

        await removeStaleBranches('', gitMock, true);

        expect(gitMock.deleteLocalBranch).not.toHaveBeenCalled();
    });

    it('should display a confirmation prompt before deleting branches', async () => {
        const localBranches = ['main', 'stale-branch'];
        const remoteBranches = ['main'];

        gitMock.branchLocal.mockResolvedValue({ all: localBranches });
        gitMock.branch.mockResolvedValue({ all: remoteBranches.map(b => `origin/${b}`) });
        gitMock.status.mockResolvedValue({ current: 'main', isClean: () => true });

        await removeStaleBranches('', gitMock, true);

        expect(readlineMock).toHaveBeenCalled();
        expect(gitMock.deleteLocalBranch).toHaveBeenCalledTimes(1);
        expect(gitMock.deleteLocalBranch).toHaveBeenCalledWith('stale-branch');
    });

    it('should not delete branches if the user declines the confirmation', async () => {
        const localBranches = ['main', 'stale-branch'];
        const remoteBranches = ['main'];

        gitMock.branchLocal.mockResolvedValue({ all: localBranches });
        gitMock.branch.mockResolvedValue({ all: remoteBranches.map(b => `origin/${b}`) });
        gitMock.status.mockResolvedValue({ current: 'main', isClean: () => true });

        // Update the readline mock to simulate the user declining
        readlineMock.mockReturnValueOnce({
            question: jest.fn((_, cb) => cb('n')),
            close: jest.fn(),
        });

        await removeStaleBranches('', gitMock, true);

        expect(readlineMock).toHaveBeenCalled();
        expect(gitMock.deleteLocalBranch).not.toHaveBeenCalled();
    });
});
