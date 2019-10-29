import { expect } from 'chai';
import { Lawbook } from '../../../src/lawbook';
import law from './openApiSchema';

const lawName = 'openApiSchema';

describe(`Law: ${lawName}`, function() {
    beforeEach(async function(this: any) {
        this.book = new Lawbook({
            laws: {
                [lawName]: {
                    required: 'must',
                },
            },
        });
        await law(this.book);
        this.law = this.book.filter(lawName).laws[0];
    });

    it('foo', async function() {
        await this.book.enforce(this.law.name, {}, {});
    });
});
