import assert from 'node:assert/strict';
import test from 'node:test';
import { RedBlackTree } from './RedBlackTree.js';

function assertValid(tree) {
    const result = tree.validateProperties();
    assert.equal(result.valid, true, result.violations.join('\n'));
}

function permutations(values) {
    if (values.length < 2) return [values];
    return values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index))
        .map((rest) => [value, ...rest]));
}

function shuffled(values, random) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

test('insertion handles root, recoloring, and all rotation orientations', () => {
    const rotationCases = [
        [30, 20, 10],
        [10, 20, 30],
        [30, 10, 20],
        [10, 30, 20],
    ];

    for (const values of rotationCases) {
        const tree = new RedBlackTree();
        const events = [];
        values.forEach((value) => {
            tree.insert(value, (event) => events.push(event));
            assertValid(tree);
        });
        assert.equal(tree.root.color, 'black');
        assert.ok(events.some((event) => event.operation.includes('rotation')));
    }

    const recolorTree = new RedBlackTree();
    const recolorEvents = [];
    [10, 5, 15, 1].forEach((value) => recolorTree.insert(value, (event) => recolorEvents.push(event)));
    assertValid(recolorTree);
    assert.ok(recolorEvents.some((event) => event.operation === 'Recolor parent and uncle'));
});

test('deletion preserves Red-Black properties through all small insertion and deletion orders', () => {
    const orders = permutations([1, 2, 3, 4, 5]);
    for (const insertionOrder of orders) {
        for (const deletionOrder of orders) {
            const tree = new RedBlackTree();
            insertionOrder.forEach((value) => {
                tree.insert(value);
                assertValid(tree);
            });
            deletionOrder.forEach((value) => {
                tree.delete(value);
                assertValid(tree);
            });
            assert.equal(tree.root, null);
            assert.equal(tree.getNodeCount(), 0);
        }
    }
});

test('deletion handles missing values, duplicates, empty tree, and two-child successors', () => {
    const tree = new RedBlackTree();
    tree.delete(99);
    assertValid(tree);

    const events = [];
    [20, 10, 30, 25, 40, 22].forEach((value) => tree.insert(value));
    tree.insert(20);
    assert.equal(tree.getNodeCount(), 6);
    tree.delete(20, (event) => events.push(event));
    assertValid(tree);
    assert.ok(events.some((event) => event.operation.startsWith('Use successor')));
    assert.deepEqual(tree.getInOrder(), [10, 22, 25, 30, 40]);
});

test('operation snapshots do not change after later mutations', () => {
    const tree = new RedBlackTree();
    const events = [];
    tree.insert(10, (event) => events.push(event));
    const recordedRoot = events.at(-1).snapshot;
    tree.insert(5, (event) => events.push(event));
    assert.equal(recordedRoot.value, 10);
    assert.equal(recordedRoot.left, null);
    assert.equal(events.at(-1).snapshot.left.value, 5);
    assertValid(tree);
});

test('deletion history covers every mirrored sibling and child-color case', () => {
    let seed = 481516;
    const random = () => {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
    };
    const observedCases = new Set();

    for (let run = 0; run < 300; run++) {
        const values = shuffled(Array.from({ length: 25 }, (_, index) => index - 12), random);
        const tree = new RedBlackTree();
        values.forEach((value) => {
            tree.insert(value);
            assertValid(tree);
        });
        shuffled(values, random).forEach((value) => {
            tree.delete(value, (event) => {
                if (event.operation.startsWith('Deletion fix:')) observedCases.add(event.operation);
            });
            assertValid(tree);
        });
    }

    [
        'Deletion fix: red sibling',
        'Deletion fix: red sibling (mirror)',
        'Deletion fix: black sibling with black children',
        'Deletion fix: black sibling with black children (mirror)',
        'Deletion fix: red near child',
        'Deletion fix: red near child (mirror)',
        'Deletion fix: red far child',
        'Deletion fix: red far child (mirror)',
    ].forEach((caseName) => assert.ok(observedCases.has(caseName), `Missing case: ${caseName}`));
});
