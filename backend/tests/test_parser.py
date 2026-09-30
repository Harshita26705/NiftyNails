from types import SimpleNamespace as NS

import pytest

from app.ml.attribute_parser import AttributeParser, parse_price
from app.ml.text import singular, tokenize
from app.ml.vocabulary import Vocabulary


def lookup(id_, name, **kw):
    return NS(id=id_, name=name, slug=name.lower().replace(" ", "-"), synonyms=kw.pop("synonyms", []),
              is_active=kw.pop("is_active", True), **kw)


@pytest.fixture(scope="module")
def parser() -> AttributeParser:
    vocab = Vocabulary.from_rows(
        colour=[lookup(1, "Baby Pink", hex="#F8C8D8", family="pink", synonyms=["light pink"]),
                lookup(2, "White", hex="#FFFFFF", family="white"),
                lookup(3, "Cherry Red", hex="#B0102A", family="red"),
                lookup(4, "Mint", hex="#B5E5CF", family="green")],
        finish=[lookup(1, "Chrome", flashiness=3, surcharge_paise=0, synonyms=["metallic"]),
                lookup(2, "Matte", flashiness=0, surcharge_paise=0)],
        shape=[lookup(1, "Almond", svg_key="almond"), lookup(2, "Coffin", svg_key="coffin", synonyms=["ballerina"])],
        charm=[lookup(1, "White Bow", category="bow", flashiness=1, stock=10, price_paise=0, asset_key="bow",
                      synonyms=["bow"]),
               lookup(2, "Pearl", category="pearl", flashiness=1, stock=10, price_paise=0, asset_key="pearl"),
               lookup(3, "3D Strawberry", category="fruit", flashiness=2, stock=5, price_paise=0,
                      asset_key="strawberry", synonyms=["strawberry"]),
               lookup(4, "Seashell", category="ocean", flashiness=1, stock=0, price_paise=0, asset_key="shell")],
        style=[lookup(1, "Kawaii", synonyms=["cute"])],
        occasion=[lookup(1, "Wedding", synonyms=["sangeet"])],
    )
    return AttributeParser(vocab)


def test_singular_and_tokenize():
    assert singular("strawberries") == "strawberry"
    assert singular("bows") == "bow"
    assert singular("glass") == "glass"
    assert tokenize("Tiny white BOWS, pearls!") == ["tiny", "white", "bow", "pearl"]


def test_spec_example(parser):
    q = parser.parse("I want baby pink almond nails with chrome, little bows and pearls. "
                     "Something cute but not too flashy.")
    assert q.colours == ["baby-pink"]
    assert q.shapes == ["almond"]
    assert q.finishes == ["chrome"]
    assert set(q.charms) == {"white-bow", "pearl"}
    assert q.styles == ["kawaii"]
    assert q.flash_preference == "low"
    assert not q.unavailable


def test_quantities_and_charm_colours(parser):
    q = parser.parse("two light pink bows and 4 pearls")
    assert q.charms == {"white-bow": 2, "pearl": 4}
    assert q.charm_colours == {"white-bow": "baby-pink"}


def test_negation(parser):
    q = parser.parse("almond, no chrome, without red, matte please")
    assert q.excluded_finishes == ["chrome"]
    assert q.excluded_colours == ["cherry-red"]
    assert q.finishes == ["matte"]


def test_unavailable_decoration_suggests_closest(parser):
    q = parser.parse("cherries on every nail")
    item = next(u for u in q.unavailable if u.requested == "cherry")
    assert item.suggestion_slug == "3d-strawberry"
    assert "3d-strawberry" in q.charms


def test_out_of_stock_charm_is_substituted(parser):
    q = parser.parse("seashell nails")
    assert q.unavailable[0].reason == "out_of_stock"
    assert "seashell" not in q.charms


def test_unoffered_colour_maps_to_nearest(parser):
    q = parser.parse("teal nails")
    assert q.unavailable and q.unavailable[0].kind == "colour"
    assert q.colours == ["mint"]


def test_colour_family_word_is_not_unavailable(parser):
    q = parser.parse("pink nails")
    assert q.colours == ["baby-pink"]
    assert not q.unavailable


def test_shape_synonym_and_lexicon(parser):
    assert parser.parse("ballerina nails").shapes == ["coffin"]
    q = parser.parse("stiletto nails")  # not offered → closest similar shape
    assert q.shapes == ["almond"] and q.unavailable[0].kind == "shape"


@pytest.mark.parametrize("text,expected", [
    ("under ₹900", (None, 90000)),
    ("budget of rs 1,500", (None, 150000)),
    ("between 700 and 1200", (70000, 120000)),
    ("around ₹1.5k", (None, 150000)),
    ("2 bows please", (None, None)),
])
def test_price_parsing(text, expected):
    assert parse_price(text) == expected
